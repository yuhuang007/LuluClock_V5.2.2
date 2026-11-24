#include "BleLink.h"
#include "Version.h"
#include "DeviceIdentity.h"
#include <esp_mac.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <atomic>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>

namespace blelink {
namespace {
struct Message { char text[MAX_LINE]; };
QueueHandle_t rxQueue=nullptr,txQueue=nullptr;
BLECharacteristic *events=nullptr;
std::atomic<bool> linked{false},stopRequested{false},disconnected{false};
char assembly[MAX_LINE]; size_t used=0; bool overflow=false;
Message transmitting{}; size_t txOffset=0; bool haveTx=false;
uint32_t lastPacket=0;
deviceidentity::Identity identity;
class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer *) override { linked=true; }
  void onDisconnect(BLEServer *) override { linked=false; disconnected=true; used=0; overflow=false; }
};
class CommandCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) override {
    auto data=characteristic->getValue();
    for (size_t i=0;i<data.length();++i) {
      char c=data[i];
      if (c=='\r') continue;
      if (c=='\n') {
        if (!overflow && used) {
          Message message{}; memcpy(message.text,assembly,used);
          if (xQueueSend(rxQueue,&message,0)!=pdTRUE) stopRequested=true;
        } else if (overflow) stopRequested=true;
        used=0; overflow=false;
      } else if (c>=32 && c<=126 && used<MAX_LINE-1) assembly[used++]=c;
      else overflow=true;
    }
  }
};
class StopCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *) override { stopRequested=true; used=0; overflow=false; }
};
ServerCallbacks serverCallbacks;
CommandCallbacks commandCallbacks;
StopCallbacks stopCallbacks;
}
bool begin() {
  uint8_t factoryMac[6]{};
  if(esp_efuse_mac_get_default(factoryMac)!=ESP_OK||!deviceidentity::make(factoryMac,identity))return false;
  rxQueue=xQueueCreate(8,sizeof(Message)); txQueue=xQueueCreate(12,sizeof(Message));
  if (!rxQueue || !txQueue || !BLEDevice::init(identity.name)) return false;
  BLEServer *server=BLEDevice::createServer();
  server->setCallbacks(&serverCallbacks); server->advertiseOnDisconnect(true);
  BLEService *service=server->createService(SERVICE);
  auto commands=service->createCharacteristic(COMMAND,BLECharacteristic::PROPERTY_WRITE);
  commands->setCallbacks(&commandCallbacks);
  events=service->createCharacteristic(EVENT,BLECharacteristic::PROPERTY_READ|BLECharacteristic::PROPERTY_NOTIFY);
  events->setValue("0|HELLO|JianClock-S3-" JIANCLOCK_VERSION "\n");
  auto stop=service->createCharacteristic(STOP,BLECharacteristic::PROPERTY_WRITE);
  stop->setCallbacks(&stopCallbacks);
  service->start();
  auto advertising=BLEDevice::getAdvertising();
  // Legacy ADV has a 31-byte limit: flags + 128-bit service = 21 bytes.
  // The UTF-8 brand and full factory ID occupy 27 bytes in the scan response.
  BLEAdvertisementData advertisement, scanResponse;
  advertisement.setFlags(0x06);
  advertisement.setCompleteServices(BLEUUID(SERVICE));
  scanResponse.setName(identity.name);
  if (!advertising->setAdvertisementData(advertisement) ||
      !advertising->setScanResponseData(scanResponse)) return false;
  advertising->setScanResponse(true);
  return advertising->start();
}
bool connected() { return linked.load(); }
const char *deviceCode(){return identity.code;}
bool interrupted(bool includeDisconnect) { return stopRequested.load() || (includeDisconnect && disconnected.load()); }
bool takeStop() {
  if (!stopRequested.exchange(false)) return false;
  if (rxQueue) xQueueReset(rxQueue);
  if (txQueue) xQueueReset(txQueue);
  // End a partially delivered event before the STOP acknowledgement starts.
  // Otherwise the phone could read the old prefix and new ACK as one bad line.
  strcpy(transmitting.text,"\n"); txOffset=0; haveTx=linked.load(); return true;
}
bool takeDisconnect() {
  if (!disconnected.exchange(false)) return false;
  if (rxQueue) xQueueReset(rxQueue);
  if (txQueue) xQueueReset(txQueue);
  haveTx=false; return true;
}
bool receive(char *line) {
  Message message;
  if (!rxQueue || xQueueReceive(rxQueue,&message,0)!=pdTRUE) return false;
  memcpy(line,message.text,MAX_LINE); return true;
}
void send(const String &line) {
  if (!linked || !txQueue || line.length()>MAX_LINE-2) return;
  Message message{}; line.toCharArray(message.text,MAX_LINE-1);
  strcat(message.text,"\n");
  // Missing ACK is detected by the phone; never block servo motion on BLE congestion.
  xQueueSend(txQueue,&message,0);
}
void tick() {
  if (!linked || !events || millis()-lastPacket<8) return;
  if (!haveTx) {
    if (xQueueReceive(txQueue,&transmitting,0)!=pdTRUE) return;
    txOffset=0; haveTx=true;
  }
  size_t length=strlen(transmitting.text);
  size_t count=std::min(static_cast<size_t>(20),length-txOffset);
  events->setValue(reinterpret_cast<uint8_t *>(transmitting.text+txOffset),count);
  events->notify(); txOffset+=count; lastPacket=millis();
  if (txOffset==length) haveTx=false;
}
}
