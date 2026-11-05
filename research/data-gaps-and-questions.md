# Missing Data & Questions for the Researcher

> Phase 2 · Ibrahim Taha Axiom · generated 2026-11-05T20:18:50+00:00 by `scripts/ingestion/s08_reports.py`
> **Not yet reviewed by the researcher.** Committed to the repository with the project owner's approval (2026-11-05). Nothing here goes on the public website until the researcher approves it. Personal contact data is deliberately excluded.

## Data gaps

| Gap | Impact | What would close it |
|---|---|---|
| Google Scholar rows beyond the first 20 | possible missing works | Google Scholar → Export all → BibTeX |
| JMASM 2019 paper: no DOI, volume or issue found | incomplete citation | PDF or full citation |
| 2018 and 2019 conference papers: no proceedings details | incomplete citation | proceedings title, pages, publisher (ISSR, Cairo University?) |
| Master's thesis 2019: only title, school and year | incomplete citation | exact title page, supervisor(s), department, link if public |
| 4 self-published guides: type and URL unknown | cannot be cited properly | ResearchGate links or files, and the intended type (book, report, guide) |
| 3 possible duplicate guide rows | risk of double listing | confirm which titles are distinct works |
| Abstracts missing for some works | weaker publication pages | author-provided abstracts (only for works the researcher owns rights to) |
| No course list | teaching section empty | courses taught (title, level, term, institution), syllabi or slides to share |
| No talk list | talks section empty | talks, seminars and workshops (title, event, date, slides) |
| No official bio or Arabic name | about page blocked | approved bio in English and Arabic; Arabic name spelling |
| Scopus and WoS not accessible | no official index metrics | exports from Scopus and WoS, or permission to omit them |

## Questions (answers become `researcher_confirmed` evidence)

### الهوية والانتماء (Identity & affiliation)
1. ما هو الاسم الرسمي بالعربية؟ وهل الاسم المعتمد بالإنجليزية "Ibrahim Mohamed Taha" أم "Ibrahim M. Taha"؟
2. فرع أكاديمية السادات: ورقتا 2023 و2025 تذكران **طنطا**، وورقة 2026 والموقع القديم يذكران **المعادي، القاهرة**. هل انتقلت بين الفرعين؟ وأيهما الحالي؟
3. هل حالة الدكتوراه في كلية الدراسات العليا للبحوث الإحصائية بجامعة القاهرة (FGSSR) ما زالت "قيد الدراسة"؟ وما سنة القيد أو العنوان المبدئي للرسالة إن أمكن نشره؟
4. يوجد **رقمان مختلفان لـ Scopus Author ID** (57226774796 و 58577960300). هل هما حسابك؟ (يُفضّل طلب دمجهما من Scopus.)
5. هل حساب GitHub `IbrahimTaha2018` حسابك؟ وما هو مستودع `SVM_New`؟ وما الرخصة المقصودة لمستودع البيانات (Zenodo يقول CC-BY-4.0 وGitHub بلا رخصة)؟

### المنشورات (Publications)
6. **سنة النشر المعتمدة**: ورقة Beta ridge (نُشرت إلكترونيًا 2021، وفي العدد 52(9) سنة 2023)، وورقة SOIC عن الـ prior (إلكترونيًا 2024، والمجلد 13(2) سنة 2025). نعرض سنة العدد المطبوع؟
7. **ترتيب المؤلفين** في ورقة TAM: إيداع الـ DOI يقول Elnady–Taha–Abdella، والنسخة الأولية وGoogle Scholar يقولان Abdella–Taha–Elnady. أيهما الرسمي؟
8. ورقة JMASM 2019: هل يوجد ملف أو DOI أو رابط؟
9. ورقتا المؤتمر 2018/2019: هل نُشرتا في كتاب وقائع؟ وهل قدّمتهما بنفسك (لنضيفهما كمحاضرات)؟
10. الأدلة المنشورة على ResearchGate (ARDL، Ridge، Sample Size، Regression Handbook): ما نوعها (كتاب/دليل/تقرير)؟ وهل نعرضها في الموقع؟ وهل "Sample Size Calculation" و"A Comprehensive Guide to Ridge Regression" نسخ مكررة أم أعمال مختلفة؟
11. أي الأوراق تريدها **مميزة (selected)** في الصفحة الرئيسية؟
12. هل نعرض تصنيفات Q1/Q2؟ (لن تُعرض إلا بمصدر وسنة، مثل SJR أو JCR.)

### التدريس والمحاضرات والمجتمع (Teaching, talks, community)
13. ما المقررات التي تدرّسها أو درّستها كمعيد (الاسم، المستوى، الفصل)؟ وهل توجد مواد يمكن نشرها؟
14. ما المحاضرات أو الورش أو الندوات التي قدّمتها (العنوان، الجهة، التاريخ، الشرائح)؟
15. مجتمع "Statistical Analysis – Egypt": هل نعرض الأرقام؟ (رقم تيليجرام يمكن التحقق منه، وأرقام فيسبوك لا.)
16. هل نعرض "450+ تقرير تحليل إحصائي" وخدمات الاستشارات في الموقع الأكاديمي، أم نفصلها؟

### النشر والخصوصية (Publishing & privacy)
17. هل نعرض البريد الإلكتروني أو الهاتف؟ (التوصية: لا. نموذج تواصل بدلًا منهما، D-08.)
18. هل توافق على رفع ملفات التقارير في `research/` إلى الريبو العام بعد المراجعة؟
