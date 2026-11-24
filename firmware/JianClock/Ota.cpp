#include "Ota.h"
#include "OtaPolicy.h"
#include "Version.h"
#include <WiFi.h>
#include <algorithm>
#include <atomic>
#include <esp_http_server.h>
#include <esp_ota_ops.h>
#include <esp_random.h>
#include <mbedtls/sha256.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

// Keep a newly OTA-booted image pending until the main loop and BLE initialize.
// Arduino's default marks valid before setup; defer that decision to loop().
extern "C" bool verifyRollbackLater(){return true;}

namespace ota {
namespace {
enum Stage { Off,Connecting,Ready,Receiving,Checking,Reboot,Failed,Cancelled };
std::atomic<int> stage{Off};
std::atomic<bool> aborted{false},worker{false};
std::atomic<size_t> received{0};
SemaphoreHandle_t gate=nullptr;
httpd_handle_t server=nullptr;
const esp_partition_t *target=nullptr;
size_t expected=0;
char digest[65]{},token[33]{},failure[40]{};
uint32_t started=0,rebootAt=0;
bool wifiOwned=false;
const char *stageName(int s){switch(s){case Off:return "off";case Connecting:return "connecting";case Ready:return "ready";case Receiving:return "uploading";case Checking:return "checking";case Reboot:return "rebooting";case Failed:return "failed";default:return "cancelled";}}
void fail(const char *reason){strlcpy(failure,reason,sizeof(failure));stage=Failed;}
esp_err_t reply(httpd_req_t *req,const char *status,const char *body){httpd_resp_set_status(req,status);httpd_resp_set_type(req,"text/plain");return httpd_resp_sendstr(req,body);}
esp_err_t upload(httpd_req_t *req){
  // Short critical sections synchronize cancel and the final boot selection.
  xSemaphoreTake(gate,portMAX_DELAY);
  char auth[48]{};char wanted[48];snprintf(wanted,sizeof(wanted),"Bearer %s",token);
  bool authorized=stage==Ready&&!aborted&& !otapolicy::expired(millis(),started)&&
    httpd_req_get_hdr_value_str(req,"Authorization",auth,sizeof(auth))==ESP_OK&&!strcmp(auth,wanted);
  if(!authorized){xSemaphoreGive(gate);return reply(req,"403 Forbidden","SESSION_REQUIRED");}
  if(req->content_len!=expected){xSemaphoreGive(gate);return reply(req,"400 Bad Request","BAD_LENGTH");}
  stage=Receiving;worker=true;xSemaphoreGive(gate);
  esp_ota_handle_t handle=0;bool begun=false;
  mbedtls_sha256_context hash;mbedtls_sha256_init(&hash);mbedtls_sha256_starts(&hash,0);
  uint8_t buffer[2048],header[otapolicy::MIN_IMAGE]{};size_t headerBytes=0;const char *error=nullptr;
  uint32_t lastData=millis();
  while(received<expected&&!error){
    if(aborted||otapolicy::expired(millis(),started)){error="CANCELLED";break;}
    int n=httpd_req_recv(req,reinterpret_cast<char*>(buffer),std::min(sizeof(buffer),expected-received.load()));
    if(n==HTTPD_SOCK_ERR_TIMEOUT){if(millis()-lastData>10000)error="TRANSFER_TIMEOUT";continue;}
    if(n<=0){error="TRANSFER_LOST";break;}lastData=millis();
    if(headerBytes<sizeof(header)){
      size_t copy=std::min(static_cast<size_t>(n),sizeof(header)-headerBytes);memcpy(header+headerBytes,buffer,copy);headerBytes+=copy;
      // Buffer the initial prefix until it can be validated, before erasing Flash.
      if(headerBytes<sizeof(header)){received+=n;mbedtls_sha256_update(&hash,buffer,n);continue;}
      if(!otapolicy::imageHeader(header,sizeof(header))){error="WRONG_FIRMWARE";break;}
      if(esp_ota_begin(target,expected,&handle)!=ESP_OK){error="FLASH_BEGIN_FAILED";break;}begun=true;
      if(received>0 && esp_ota_write(handle,header,received.load())!=ESP_OK){error="FLASH_WRITE_FAILED";break;}
    }
    if(esp_ota_write(handle,buffer,n)!=ESP_OK){error="FLASH_WRITE_FAILED";break;}
    if(mbedtls_sha256_update(&hash,buffer,n)!=0){error="HASH_FAILED";break;}
    received+=n;
  }
  uint8_t sum[32]{};char actual[65]{};
  if(!error){stage=Checking;if(mbedtls_sha256_finish(&hash,sum)!=0)error="HASH_FAILED";for(unsigned i=0;i<32;++i)snprintf(actual+2*i,3,"%02x",sum[i]);if(strcmp(actual,digest))error="SHA256_MISMATCH";}
  mbedtls_sha256_free(&hash);
  if(!error){esp_err_t result=esp_ota_end(handle);begun=false;if(result!=ESP_OK)error="IMAGE_INVALID";}
  xSemaphoreTake(gate,portMAX_DELAY);
  if(!error && (aborted||otapolicy::expired(millis(),started)))error="CANCELLED";
  if(!error && esp_ota_set_boot_partition(target)!=ESP_OK)error="BOOT_SELECT_FAILED";
  if(error){if(begun)esp_ota_abort(handle);if(aborted)stage=Cancelled;else fail(error);}
  else {rebootAt=millis()+3000;stage=Reboot;}
  worker=false;xSemaphoreGive(gate);
  return reply(req,error?"400 Bad Request":"200 OK",error?error:"OTA_OK_REBOOT");
}
}
bool active(){int s=stage;return s==Connecting||s==Ready||s==Receiving||s==Checking||s==Reboot||worker.load();}
unsigned displayStage(){return static_cast<unsigned>(stage.load());}
bool receiving(){return worker.load();}
unsigned progress(){return expected?std::min<size_t>(100,received*100/expected):0;}
const char *open(size_t bytes,const char *sha,const char *ssid,const char *password){
  if(active()||server)return "OTA_BUSY";
  if(!ssid||!*ssid)return "OTA_WIFI_REQUIRED";
  if(!otapolicy::hex(sha,64))return "OTA_BAD_SHA";
  target=esp_ota_get_next_update_partition(nullptr);
  if(!target||!otapolicy::length(bytes,target->size))return "OTA_BAD_SIZE";
  if(!gate)gate=xSemaphoreCreateMutex();if(!gate)return "OTA_NO_MEMORY";
  expected=bytes;strlcpy(digest,sha,sizeof(digest));failure[0]=0;received=0;aborted=false;
  for(unsigned i=0;i<4;++i)snprintf(token+i*8,9,"%08lx",static_cast<unsigned long>(esp_random()));
  started=millis();stage=Connecting;wifiOwned=true;
  WiFi.mode(WIFI_STA);WiFi.begin(ssid,password);return nullptr;
}
void cancel(){
  if(!gate)return;xSemaphoreTake(gate,portMAX_DELAY);
  if(stage!=Reboot){aborted=true;if(active())stage=Cancelled;}
  xSemaphoreGive(gate);
}
void tick(){
  int s=stage;
  if(s==Reboot){if(static_cast<int32_t>(millis()-rebootAt)>=0)ESP.restart();return;}
  if(active()&&otapolicy::expired(millis(),started))cancel();
  if(stage==Connecting){
    if(WiFi.status()==WL_CONNECTED){
      httpd_config_t cfg=HTTPD_DEFAULT_CONFIG();cfg.server_port=3232;cfg.ctrl_port=32769;cfg.stack_size=8192;cfg.max_open_sockets=2;cfg.recv_wait_timeout=1;cfg.send_wait_timeout=2;cfg.lru_purge_enable=true;
      if(httpd_start(&server,&cfg)!=ESP_OK){server=nullptr;fail("SERVER_FAILED");}
      else {httpd_uri_t route{};route.uri="/update";route.method=HTTP_POST;route.handler=upload;if(httpd_register_uri_handler(server,&route)!=ESP_OK)fail("SERVER_FAILED");else stage=Ready;}
    }else if(millis()-started>25000)fail("WIFI_CONNECT_FAILED");
  }
  if((stage==Failed||stage==Cancelled)&&!worker){if(server){httpd_stop(server);server=nullptr;}if(wifiOwned){WiFi.disconnect(true,false);WiFi.mode(WIFI_OFF);wifiOwned=false;}}
}
String info(long id,bool includeSecret){
  String line=String(id)+"|OTA|state="+stageName(stage)+",pct="+String(progress())+",version=" JIANCLOCK_VERSION;
  line+=",ip="+(stage==Ready?WiFi.localIP().toString():String(""))+",port=3232,error="+failure;
  if(includeSecret&&stage==Ready)line+=",token="+String(token);
  return line;
}
bool healthyBoot(bool ready){
  static bool done=false;
  if(done||millis()<10000)return false;
  esp_ota_img_states_t state;const auto *running=esp_ota_get_running_partition();
  if(esp_ota_get_state_partition(running,&state)==ESP_OK&&state==ESP_OTA_IMG_PENDING_VERIFY){
    if(!ready){if(millis()>30000)esp_ota_mark_app_invalid_rollback_and_reboot();return false;}
    if(esp_ota_mark_app_valid_cancel_rollback()!=ESP_OK)return false;
    done=true;return true;
  }
  done=true;return false;
}
}
