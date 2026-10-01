package art.lazying.clearpair.audio;

import java.util.Locale;

/** A TTS engine's closest language is not necessarily the practice language. */
public final class PracticeVoicePolicy {
    private PracticeVoicePolicy() {}
    public static String tag(String value) {
        return value.toLowerCase(Locale.ROOT).replace('_', '-');
    }
    private static boolean cantonese(String voice) {
        return voice.equals("yue") || voice.startsWith("yue-") ||
            voice.equals("zh-hk") || voice.equals("zh-hant-hk");
    }
    public static boolean matches(String available, String requested) {
        String voice = tag(available), wanted = tag(requested);
        if (wanted.equals("zh-hk")) return cantonese(voice);
        if (wanted.equals("zh-cn")) return !cantonese(voice) && (
            voice.equals("zh-cn") || voice.equals("zh-sg") || voice.equals("zh-tw") ||
            voice.equals("zh-hant-tw") || voice.equals("zh-hans") ||
            voice.startsWith("zh-hans-") || voice.equals("cmn") || voice.startsWith("cmn-"));
        return voice.split("-")[0].equals(wanted.split("-")[0]);
    }
}
