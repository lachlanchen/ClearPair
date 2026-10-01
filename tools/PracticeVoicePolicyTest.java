import art.lazying.clearpair.audio.PracticeVoicePolicy;

/** Dependency-free regression of the native language boundary, not a voice audition. */
public class PracticeVoicePolicyTest {
    private static void check(boolean expected, String voice, String language) {
        if (PracticeVoicePolicy.matches(voice, language) != expected)
            throw new AssertionError(voice+" incorrectly routed to "+language);
    }
    public static void main(String[] args) {
        check(false,"zh-HK","zh-CN");
        check(false,"zh-Hant-HK","zh-CN");
        check(false,"yue-HK","zh-CN");
        check(false,"zh","zh-CN");
        check(true,"zh-CN","zh-CN");
        check(true,"zh-TW","zh-CN");
        check(true,"cmn-Hans-CN","zh-CN");
        check(false,"zh-CN","zh-HK");
        check(false,"zh-TW","zh-HK");
        check(true,"yue_HK","zh-HK");
        check(false,"en-US","ja-JP");
        check(true,"ja_JP","ja-JP");
        check(true,"ar-EG","ar-SA");
        check(true,"en-GB","en-US");
        System.out.println("14 native voice-language regression checks passed. Audio audition not claimed.");
    }
}
