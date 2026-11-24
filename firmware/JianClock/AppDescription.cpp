// Replace Arduino's weak generic "arduino-lib-builder" descriptor so both the
// device and Android can reject an unrelated S3 application's OTA image.
#include <esp_app_desc.h>
#include <sdkconfig.h>
#include <esp_idf_version.h>
#include "Version.h"
#define JC_STRING_(x) #x
#define JC_STRING(x) JC_STRING_(x)
extern "C" const esp_app_desc_t esp_app_desc __attribute__((section(".rodata_desc"),used)) = {
  .magic_word=ESP_APP_DESC_MAGIC_WORD,
  .secure_version=0,
  .reserv1={},
  .version=JIANCLOCK_VERSION,
  .project_name="JianClock",
  .time=__TIME__,
  .date=__DATE__,
  .idf_ver="v" JC_STRING(ESP_IDF_VERSION_MAJOR) "." JC_STRING(ESP_IDF_VERSION_MINOR) "." JC_STRING(ESP_IDF_VERSION_PATCH),
  .app_elf_sha256={},
  .min_efuse_blk_rev_full=CONFIG_ESP_EFUSE_BLOCK_REV_MIN_FULL,
  .max_efuse_blk_rev_full=CONFIG_ESP_EFUSE_BLOCK_REV_MAX_FULL,
  .mmu_page_size=__builtin_ctz(CONFIG_MMU_PAGE_SIZE),
};
