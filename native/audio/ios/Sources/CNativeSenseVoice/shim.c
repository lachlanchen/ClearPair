#include "CNativeSenseVoice.h"
#include <SherpaOnnxC/sherpa-onnx/c-api/c-api.h>
#include <stdlib.h>
#include <string.h>
void *cp_sensevoice_create(const char *model, const char *tokens) {
  SherpaOnnxOfflineRecognizerConfig config = {0};
  config.feat_config.sample_rate = 16000;
  config.feat_config.feature_dim = 80;
  config.model_config.sense_voice.model = model;
  config.model_config.sense_voice.language = "yue";
  config.model_config.sense_voice.use_itn = 0;
  config.model_config.tokens = tokens;
  config.model_config.num_threads = 2;
  config.model_config.debug = 0;
  config.model_config.provider = "cpu";
  config.model_config.model_type = "sense_voice";
  config.model_config.modeling_unit = "cjkchar";
  config.decoding_method = "greedy_search";
  return (void *)SherpaOnnxCreateOfflineRecognizer(&config);
}
void cp_sensevoice_destroy(void *recognizer) {
  if (recognizer) SherpaOnnxDestroyOfflineRecognizer(recognizer);
}
char *cp_sensevoice_text(void *recognizer, const float *samples, int32_t count) {
  if (!recognizer || !samples || count < 1600 || count > 242240) return NULL;
  const SherpaOnnxOfflineStream *stream = SherpaOnnxCreateOfflineStream(recognizer);
  if (!stream) return NULL;
  SherpaOnnxAcceptWaveformOffline(stream, 16000, samples, count);
  SherpaOnnxDecodeOfflineStream(recognizer, stream);
  const SherpaOnnxOfflineRecognizerResult *result = SherpaOnnxGetOfflineStreamResult(stream);
  char *text = result && result->text && strlen(result->text) <= 2000 ? strdup(result->text) : NULL;
  if (result) SherpaOnnxDestroyOfflineRecognizerResult(result);
  SherpaOnnxDestroyOfflineStream(stream);
  return text;
}
void cp_sensevoice_free_text(char *text) { free(text); }
