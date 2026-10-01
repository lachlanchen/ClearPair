"""Explicit segment-only readings for the verified OMPAL training prompts.

These are lexical hypotheses, not labels of what a learner actually said. Tone
and neutral-tone rules are deliberately not inferred here. No automatic G2P or
homograph guessing: phrase-specific readings include dai-fu, de/dei and lv-xing.
"""

READINGS = {
    "不再把春節看得那麼重要了": "bu zai ba chun jie kan de na me zhong yao le",
    "中國陰曆的新年叫作春節": "zhong guo yin li de xin nian jiao zuo chun jie",
    "也是全家人團圓的日子": "ye shi quan jia ren tuan yuan de ri zi",
    "也有人利用這個假期去旅行": "ye you ren li yong zhe ge jia qi qu lv xing",
    "互相說一些祝福的話": "hu xiang shuo yi xie zhu fu de hua",
    "人們就要準備過年了": "ren men jiu yao zhun bei guo nian le",
    "他個子很高比較胖": "ta ge zi hen gao bi jiao pang",
    "他們都很忙": "ta men dou hen mang",
    "他們都非常忙": "ta men dou fei chang mang",
    "他的同學都叫他胖子": "ta de tong xue dou jiao ta pang zi",
    "他的女朋友很漂亮是日本人": "ta de nv peng you hen piao liang shi ri ben ren",
    "你看這是我們家": "ni kan zhe shi wo men jia",
    "使全家人一年平安": "shi quan jia ren yi nian ping an",
    "先得把屋子打掃得乾乾淨淨": "xian dei ba wu zi da sao de gan gan jing jing",
    "只要用手機發幾條短信就行了": "zhi yao yong shou ji fa ji tiao duan xin jiu xing le",
    "和一個倒著的福字表示福到了": "he yi ge dao zhe de fu zi biao shi fu dao le",
    "和一隻大花貓": "he yi zhi da hua mao",
    "和西方的聖誕節一樣": "he xi fang de sheng dan jie yi yang",
    "夜裡十二點大人和孩子都跑到外邊去放鞭炮": "ye li shi er dian da ren he hai zi dou pao dao wai bian qu fang bian pao",
    "大中小學也都在這個時候開始放寒假": "da zhong xiao xue ye dou zai zhe ge shi hou kai shi fang han jia",
    "大年三十晚上全家人坐在一起": "da nian san shi wan shang quan jia ren zuo zai yi qi",
    "孩子們還可以從大人那裡得到裝著錢的小紅包": "hai zi men hai ke yi cong da ren na li de dao zhuang zhe qian de xiao hong bao",
    "小貓的名字呢是花花": "xiao mao de ming zi ne shi hua hua",
    "就把年夜飯搬到餐館裡去吃": "jiu ba nian ye fan ban dao can guan li qu chi",
    "就連拜年也變得簡單了": "jiu lian bai nian ye bian de jian dan le",
    "帶著水果或點心去親友家拜年": "dai zhe shui guo huo dian xin qu qin you jia bai nian",
    "從陰曆十二月初開始": "cong yin li shi er yue chu kai shi",
    "我們家的房子不大也不小": "wo men jia de fang zi bu da ye bu xiao",
    "我哥哥是大學生學中文": "wo ge ge shi da xue sheng xue zhong wen",
    "我家有四口人": "wo jia you si kou ren",
    "我家還有一隻小黑狗": "wo jia hai you yi zhi xiao hei gou",
    "我母親是中學英語老師": "wo mu qin shi zhong xue ying yu lao shi",
    "我父親是一個有名的大夫": "wo fu qin shi yi ge you ming de dai fu",
    "我的小狗叫黑黑": "wo de xiao gou jiao hei hei",
    "我的房間不太大": "wo de fang jian bu tai da",
    "所以出門在外的人必須在年前趕回家來": "suo yi chu men zai wai de ren bi xu zai nian qian gan hui jia lai",
    "所以這一天也叫除夕": "suo yi zhe yi tian ye jiao chu xi",
    "所以這一天也叫除夕正月初一": "suo yi zhe yi tian ye jiao chu xi zheng yue chu yi",
    "據說這是為了把一個名字叫夕的怪物嚇跑": "ju shuo zhe shi wei le ba yi ge ming zi jiao xi de guai wu xia pao",
    "是中國人一年中最重要最熱鬧的節日": "shi zhong guo ren yi nian zhong zui zhong yao zui re nao de jie ri",
    "最近這些年大城市裡的人": "zui jin zhe xie nian da cheng shi li de ren",
    "有些人覺得在家做飯太麻煩": "you xie ren jue de zai jia zuo fan tai ma fan",
    "有四個房間": "you si ge fang jian",
    "正月初一人們穿上新衣服": "zheng yue chu yi ren men chuan shang xin yi fu",
    "比如身體健康恭喜發財萬事如意等等": "bi ru shen ti jian kang gong xi fa cai wan shi ru yi deng deng",
    "然後在門口貼上一副紅色的對聯": "ran hou zai men kou tie shang yi fu hong se de dui lian",
    "爸爸媽媽哥哥和我": "ba ba ma ma ge ge he wo",
    "裡邊有一張小桌子兩把椅子和一張床": "li bian you yi zhang xiao zhuo zi liang ba yi zi he yi zhang chuang",
    "親親熱熱地吃一頓年夜飯": "qin qin re re de chi yi dun nian ye fan",
    "還有一個非常好看的小花園": "hai you yi ge fei chang hao kan de xiao hua yuan",
}

INITIALS = "zh ch sh b p m f d t n l g k h j q x r z c s".split()
ZERO = dict(zip(
    "yi ya ye yao you yan yin yang ying yong yu yue yuan yun wu wa wo wai wei wan wen wang weng".split(),
    "i ia ie iao iou ian in iang ing iong v ve van vn u ua uo uai uei uan uen uang ueng".split()))
FINALS = set("a o e ai ei ao ou an en ang eng er i ia ie iao iou ian in iang ing iong u ua uo uai uei uan uen uang ueng ong v ve van vn ii iii".split())


def segments(syllable):
    if syllable in ZERO:
        return "ZERO/" + ZERO[syllable]
    initial = next((p for p in INITIALS if syllable.startswith(p)), "ZERO")
    final = syllable[len(initial):] if initial != "ZERO" else syllable
    if initial in {"j", "q", "x"} and final.startswith("u"):
        final = "v" + final[1:]
    if final == "i" and initial in {"z", "c", "s"}:
        final = "ii"
    elif final == "i" and initial in {"zh", "ch", "sh", "r"}:
        final = "iii"
    final = {"iu": "iou", "ui": "uei", "un": "uen"}.get(final, final)
    if final not in FINALS:
        raise ValueError("Unreviewed syllable: " + syllable)
    return initial + "/" + final


EXPANDED_PROMPTS = {text: " ".join(segments(p) for p in reading.split()) for text, reading in READINGS.items()}
if any(len(text) != len(value.split()) for text, value in EXPANDED_PROMPTS.items()):
    raise ValueError("One explicitly reviewed syllable per character is required")
