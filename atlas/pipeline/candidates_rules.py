# 抓取规范的排除规则, 所有课共用. 全文见 docs/extraction-rules.md
import re
# ---- 抓取规范 (全文见 docs/extraction-rules.md): 非知识内容不进候选. 所有课共用这一处, 不要在别处另写排除规则 ----
# 小节标题命中就跳过 (其下的 h3 一起跳过); 讲次文件名命中就整讲跳过 (例: IE-02 研讨课与评分标准, IE-05 如何写研究论文)
NONK = re.compile(r'课程组织|组织事项|课程安排|时间安排|课程(概览|目标|结构|介绍)|本周内容|^注册|注册、|^成绩|成绩:|评分标准|研讨课|报告的|文献要求|与第 ?\d+ ?周相同|练习时间|加分|关键日期|参考文献(?!表)|^文献|考试安排|考试时间|考试特别|模拟考|^(两种)?考试( |$)|考试说明|考试规则|第.次考试|重考|^作业|家庭作业|小组练习|课程内容|课程要求|课程结束后|课程与时间|讲师介绍|听课范围'
                  r'|Organisatorisch|\bTermine?\b|\bSchedules?\b|Registration|\bGrading\b|\bReferat\b|\bSeminar\b|Übungstermin|Use of AI|\bCiting\b|\bPresentations?\b|^Literatur|^References?$|Klausurrelevant|Klausurtermin|Prüfungstermin|Vorlesungsgliederung|Course organization|Course requirements|Kursübersicht|Practicalities|Hausarbeit|Hausaufgaben|Homeworks|Über mich|Hörerkreis|\bECTS\b', re.I)
NONK_FILE = re.compile(r'研讨课|评分标准|如何写|论文写作|写作方法|Seminar|Writing', re.I)
# 结构性小节: 不是知识点, 也不要求有对应 (学习目标、回顾、总结、练习题本身)
META = re.compile(r'学习目标|Lernziel|Learning goals?|^(本章|本讲)?(总结|小结)|Zusammenfassung|^Summary|Recap|^回顾|Wiederholung|^练习|Übung|Exercise|What comes next|Ausblick|Outlook', re.I)
# 语言技能课: 内容本身是写作和表达方法, 不做图谱和术语 (用户 2026-11-06 确认). 笔记栏照常显示
NOGRAPH = {'STE', 'AEAL'}
# 名称里不许出现的说法: 把比喻或字面翻译当术语 (2026-11-06: 「免费估计 / Free Estimate」来自笔记里的比喻「相当于一次免费的测试」)
BADNAME = re.compile(r'免费|白送|白拿|便宜|廉价|硬核|黑科技|万金油|傻瓜|聪明|神奇|魔法|大法|套路|\bFree\b(?! List)')
