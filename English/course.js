const word = (prompt, answers, explanation) => ({ prompt, answers, explanation });
const choice = (prompt, options, answer, explanation) => ({ prompt, options, answer, explanation });
const talk = (prompt, example, explanation) => ({ prompt, example, explanation });

export const weeks = [
  {
    number: 6, title: 'Daily routines', label: '日常习惯',
    passageTitle: 'Ten Minutes Before Breakfast',
    passage: [
      'Every school morning, Mia used to look for her keys and pack her bag just before leaving. She often missed the bus. Last month, she decided to change one thing. Now she puts her bag, keys, and bus card next to the door before she goes to bed. She sets her alarm for the same time as before.',
      'With ten extra minutes in the morning, Mia usually reads a short article over breakfast. On Fridays, she helps her brother find everything he needs for basketball practice. Some mornings are still busy, but Mia rarely misses the bus now. She says the change works because she prepares at night, when she has more time to think.'
    ],
    vocabulary: [
      word('routine', ['日常习惯', '日常惯例', '惯例', '常规', '例行程序', '例行公事'], '名词，指有规律地重复做的事。例句：Reading is part of my morning routine.'),
      word('prepare', ['准备', '预备', '做好准备', '作准备', '做准备'], '动词，prepare for 表示为某事做准备。例句：I prepare for school the night before.'),
      word('usually', ['通常', '一般', '一般来说', '平常', '平时'], '频率副词。例句：I usually have breakfast at seven.'),
      word('rarely', ['很少', '极少', '难得', '罕有', '不常', '几乎不'], '频率副词，表示某事很少发生。例句：Mia rarely misses the bus now.'),
      word('alarm clock', ['闹钟', '报时闹钟'], '名词短语。例句：My alarm clock rings at six.')
    ],
    reading: [
      choice('What does Mia do before going to bed?', ['She reads a short article.', 'She puts her things next to the door.', 'She changes the time on her alarm.'], 1, '第一段说明她睡前把书包、钥匙和公交卡放在门旁，闹钟时间保持原样。'),
      choice('When does Mia help her brother prepare for basketball practice?', ['Every school morning.', 'On Saturday evenings.', 'On Friday mornings.'], 2, '第二段的 “On Fridays” 指出她星期五早上会帮弟弟准备。'),
      choice('Why does Mia think the new routine works?', ['She prepares when she has more time to think.', 'Her brother packs her bag for her.', 'Her bus leaves later than it used to.'], 0, '最后一句说晚上时间更充裕，她能从容地准备。')
    ],
    grammar: [
      choice('Mia usually ___ a short article at breakfast.', ['read', 'reads', 'reading'], 1, '第三人称单数主语 Mia 加一般现在时，动词 read 变为 reads。'),
      choice('Which sentence puts the frequency adverb in the usual position?', ['Mia is rarely late for school.', 'Mia is late rarely for school.', 'Mia is late for rarely school.'], 0, '频率副词通常放在 be 动词之后，is rarely late 是自然的顺序。')
    ],
    speaking: [talk('Describe your weekday morning. What do you usually do, and what small change would make it easier?', 'I usually get up at seven and make breakfast. Then I look for my books and walk to the bus stop. Sometimes I forget my water bottle. I could put it next to my bag the night before, so I would see it when I leave.', '用一般现在时描述习惯。最后可以用 I could 提出一个具体改动，并用 so 说明效果。')]
  },
  {
    number: 7, title: 'Food and shopping', label: '饮食与购物',
    passageTitle: 'The Saturday Market',
    passage: [
      'Leo offered to cook dinner for three friends on Saturday. He wanted to make tomato soup, but the tomatoes in the first shop were expensive. At a stall near the bus stop, he found a box of soft tomatoes for half the price. The seller explained that they were too soft for salads but perfect for soup. Leo bought the box and some bread.',
      'At home, Leo checked the kitchen cupboards before opening the bag. He already had an onion, a little oil, and plenty of salt. He wrote down what he used and how much it cost. After dinner, his friends asked for the recipe. Next time, Leo plans to take his list to the market so he only buys what he needs.'
    ],
    vocabulary: [
      word('stall', ['摊位', '小摊', '货摊', '摊子'], '名词，在市场等地点售货的小型摊位。例句：We bought apples at a market stall.'),
      word('recipe', ['食谱', '菜谱', '烹饪配方', '配方', '做法'], '名词，包含做某道菜的材料和步骤。例句：Could you send me the recipe for the soup?'),
      word('ingredient', ['食材', '配料', '成分', '原料', '材料'], '名词，指食谱中的一种原料。例句：Tomatoes are the main ingredient.'),
      word('half price', ['半价', '一半价格', '原价的一半', '价格减半', '五折'], '名词短语。例句：The bread was half price.'),
      word('cupboard', ['橱柜', '柜子', '碗柜', '壁橱', '储物柜'], '名词，指有门的储藏柜。例句：There are two bowls in the cupboard.')
    ],
    reading: [
      choice('Why were the cheaper tomatoes suitable for Leo?', ['He planned to make soup.', 'He wanted to make a salad.', 'He needed them for next weekend.'], 0, '摊主说这些番茄已经很软，适合做汤。'),
      choice('Which item did Leo already have at home?', ['Bread.', 'Tomatoes.', 'An onion.'], 2, '第二段列出家里原本就有的洋葱、油和盐。'),
      choice('Why will Leo take a list next time?', ['To share the recipe with the seller.', 'To avoid buying things he does not need.', 'To remember the names of his guests.'], 1, '文章结尾用 “so he only buys what he needs” 说明了带清单的目的。')
    ],
    grammar: [
      choice('There is ___ oil in the bottle.', ['a few', 'many', 'a little'], 2, 'oil 在这里是不可数名词，表示少量时用 a little 修饰。'),
      choice('How ___ tomatoes do we need for the soup?', ['many', 'much', 'little'], 0, 'tomatoes 是可数名词复数，询问数量用 how many。')
    ],
    speaking: [talk('Plan a simple meal for a friend. Say what you will cook, what ingredients you need, and where you will buy them.', 'I would make egg and vegetable rice. I already have a little rice and some oil at home. I need two eggs, a carrot, and a small bag of peas. I will buy them at the market because it is close to my house.', '介绍菜名后，把已有和需要购买的食材分开说。用 a little 修饰不可数名词，用数字修饰可数名词。')]
  },
  {
    number: 8, title: 'Getting around', label: '出行与问路',
    passageTitle: 'The Library Across the River',
    passage: [
      'Nora was meeting a classmate at the library at noon. The nearest bridge was closed for repairs, so the usual bus stopped on the wrong side of the river. At the stop, a driver told Nora about a footbridge behind the station. It was open to people on foot, but bikes had to use a different route.',
      'Nora followed a blue sign to the station, crossed the footbridge, and turned left at a bakery. She reached the library ten minutes early. On the way back, she took a ferry because the stop was closer to the library. The ferry crossed the river quickly, but it ran only once an hour. Nora was glad she checked the timetable before leaving the library.'
    ],
    vocabulary: [
      word('footbridge', ['人行桥', '人行天桥', '步行桥', '行人桥'], '名词，供行人通行的桥。例句：Cross the footbridge to reach the station.'),
      word('ferry', ['渡船', '渡轮', '轮渡', '摆渡船'], '名词，运送乘客或车辆渡水的船。例句：We took a ferry across the river.'),
      word('timetable', ['时刻表', '时间表', '班次表', '时间安排表'], '名词，表示交通班次或活动时间。例句：Check the bus timetable before you leave.'),
      word('route', ['路线', '线路', '路径', '行程路线'], '名词，指从一地到另一地所走的路线。例句：This route takes us past a bakery.'),
      word('on foot', ['步行', '徒步', '走路', '步行前往'], '介词短语。例句：I go to the library on foot.')
    ],
    reading: [
      choice('Why could Nora not follow her usual bus route all the way?', ['The bus driver did not know the route.', 'The nearest bridge was being repaired.', 'The library had moved across the river.'], 1, '首段说最近的桥因维修关闭，公交车只能停在河的另一侧。'),
      choice('What did Nora do after crossing the footbridge?', ['She looked for a blue sign.', 'She boarded another bus.', 'She turned left at a bakery.'], 2, '第二段的动作顺序是看到蓝色标识、过桥、在面包店左转。'),
      choice('Why was checking the ferry timetable useful?', ['A ferry left only once an hour.', 'The ferry stopped running at noon.', 'The ferry stop was hard to find.'], 0, '渡轮过河很快，但一小时只有一班，所以出发前得确认时间。')
    ],
    grammar: [
      choice('Nora ___ the footbridge yesterday.', ['crosses', 'crossed', 'has crossed'], 1, 'yesterday 指向已经结束的具体过去时间，所以用一般过去时 crossed。'),
      choice('To give a direct instruction, say “___ left at the bakery.”', ['Turning', 'To turn', 'Turn'], 2, '祈使句直接用动词原形开头，省略主语 you。')
    ],
    speaking: [talk('Give a visitor directions from a station to your school, a park, or a place you know. Include at least two landmarks.', 'Leave the station through the main door and turn right. Walk straight until you see a supermarket. Cross the street there, then turn left at the bakery. The park is next to the pharmacy. It takes about eight minutes on foot.', '用 leave、walk、turn 等动词原形给出指令。加入可见地标和大致步行时间。')]
  },
  {
    number: 9, title: 'Health and habits', label: '健康习惯',
    passageTitle: 'A Walk That Fits',
    passage: [
      'Sam wanted to move more during the week. At first, he planned to run every evening, but after three busy days he had not gone out once. His friend Anya suggested something easier. Their office was a five-minute walk from a small park, so she invited him to take a short walk with her after lunch.',
      'For the first week, they walked for ten minutes on Monday, Wednesday, and Friday. On rainy days, they walked through the covered market instead. Sam liked having company, and he did not mind returning to work a little early. By the end of the month, he was walking on most weekdays. He still wants to try running, but the lunchtime walk fits his schedule now.'
    ],
    vocabulary: [
      word('habit', ['习惯', '习性'], '名词，指经常重复的行为。例句：I am trying to build a daily reading habit.'),
      word('suggest', ['建议', '提议', '提出建议', '提出'], '动词，后面可接名词、动名词或 that 从句。例句：Anya suggested walking after lunch.'),
      word('covered market', ['有顶棚的市场', '室内市场', '有遮盖的市场', '带顶棚的市场', '有屋顶的市场'], '名词短语。covered 在此形容市场有遮蔽。例句：The covered market stays busy when it rains.'),
      word('weekday', ['工作日', '平日', '周间', '非周末的日子'], '名词，通常指星期一到星期五中的一天。例句：The park is quiet on weekdays.'),
      word('fit my schedule', ['符合我的日程安排', '适合我的日程安排', '符合我的时间安排', '适合我的时间安排', '和我的时间安排合得来', '适合我的日程'], '动词短语。例句：A lunchtime walk fits my schedule.')
    ],
    reading: [
      choice('Why did Sam change his first exercise plan?', ['He was too busy to begin his evening runs.', 'The park was closed to runners.', 'Anya wanted him to run farther.'], 0, '萨姆计划每天傍晚跑步，但前三天太忙，一次都没出去。'),
      choice('What did they do when it rained?', ['They went running in the park.', 'They walked through the covered market.', 'They waited until the evening.'], 1, '第二段说明下雨天他们改去有顶棚的市场散步。'),
      choice('What helped Sam continue his new habit?', ['His boss gave him a longer lunch break.', 'He needed to prepare for a race.', 'He enjoyed the company and the timing suited him.'], 2, '萨姆喜欢有人作伴，午饭后的短暂散步也符合他的时间安排。')
    ],
    grammar: [
      choice('Anya suggested ___ for ten minutes at lunchtime.', ['walk', 'to walk', 'walking'], 2, 'suggest 后面直接接动词时，动词用 -ing 形式。'),
      choice('Which sentence gives advice without expressing a rule?', ['You should try a short walk after lunch.', 'You must try a short walk after lunch.', 'You are required to try a short walk after lunch.'], 0, 'should 常用来给建议，must 和 are required to 在这里都表达要求。')
    ],
    speaking: [talk('Describe a healthy habit you could keep for one month. When and where would you do it? What would make it easier to continue?', 'I could take a short walk after dinner three times a week. I would walk around the block with my sister. If it rained, I could walk inside the shopping centre. Going with someone would make it easier to keep going.', '把频率、地点和替代方案说具体。用 could 或 would 说明你考虑采用的做法。')]
  },
  {
    number: 10, title: 'Learning strategies', label: '学习方法',
    passageTitle: 'A Notebook for Better Questions',
    passage: [
      'When Lina first read English articles, she stopped to look up every new word. A short article could take her forty minutes, and she sometimes forgot what the first paragraph was about. Her teacher asked her to try reading the whole article once before opening a dictionary. During this first reading, Lina used the title and pictures to predict what she would read.',
      'On her second reading, Lina marked only the words that prevented her from understanding a key idea. Instead of copying long definitions, she wrote a short question about each word, such as “Does charge mean pay or ask someone to pay here?” The next day, she tried to answer her questions from memory. After two weeks, she was reading faster and remembering more useful words.'
    ],
    vocabulary: [
      word('look up a word', ['查单词', '查词', '查找单词', '查询单词', '查一个单词', '查阅单词'], '动词短语。look up 表示为获得信息而查找。例句：I looked up the word in a dictionary.'),
      word('predict', ['预测', '预料', '预判', '预估', '推测'], '动词，表示根据已知信息判断将要发生的事。例句：Use the title to predict the topic.'),
      word('definition', ['定义', '释义', '词义解释', '界定'], '名词，在词典中表示对词义的解释。例句：The dictionary gives a short definition.'),
      word('key idea', ['核心观点', '主要观点', '关键想法', '核心思想', '主旨', '主要意思', '关键内容'], '名词短语，其中 key 是形容词，意为重要的。例句：Write down the key idea in each paragraph.'),
      word('from memory', ['凭记忆', '根据记忆', '靠记忆', '凭借记忆'], '介词短语，指凭记忆说或做。例句：Can you tell me the story from memory?')
    ],
    reading: [
      choice('What did Lina do during the first reading with her new strategy?', ['She checked every unfamiliar word.', 'She used the title and pictures to predict the topic.', 'She copied the first paragraph.'], 1, '标题和插图给了莉娜预测文章内容的线索，这一步发生在查词之前。'),
      choice('Which unknown words did she mark during the second reading?', ['Only words that blocked her understanding of a main idea.', 'Only words that appeared in the title.', 'Only words with long definitions.'], 0, '第二段明确限定为影响理解关键观点的生词。'),
      choice('What did Lina do the next day?', ['She asked her teacher for a new dictionary.', 'She read another article about the same subject.', 'She tried to answer her own questions without looking.'], 2, '“from memory” 表示第二天她凭记忆回答自己写下的问题。')
    ],
    grammar: [
      choice('Lina stopped reading halfway through the paragraph. Which sentence has the same meaning?', ['Lina stopped to read halfway through the paragraph.', 'Lina began reading halfway through the paragraph.', 'Lina did not continue reading past the middle of the paragraph.'], 2, 'stop doing 指停止正在做的事。stop to do 指停下手头的事去做另一件事。'),
      choice('Complete the phrase “instead of ___ long definitions.”', ['copying', 'copy', 'to copy'], 0, 'instead of 后接名词或动名词，所以用 copying。')
    ],
    speaking: [talk('Explain how you would read an English article with several unfamiliar words. Describe what you would do before, during, and after reading.', 'Before reading, I look at the title and guess the topic. On my first reading, I try to understand the main idea. Then I check the words that I really need. After reading, I write one sentence about the article and try to remember it the next day.', '用 before、on my first reading、then 和 after 组织叙述。说明查词的时机和复习方法。')]
  },
  {
    number: 11, title: 'Community projects', label: '社区活动',
    passageTitle: 'Tools You Can Share',
    passage: [
      'Residents in Brook Lane often needed a drill or a ladder for just one afternoon. They disliked buying tools they would rarely use, so the community centre opened a small tool library. People signed up for free and could borrow up to three items for one week. Before taking an item home, borrowers checked its condition with a volunteer.',
      'The project became popular, but some borrowers returned tools late. This meant the next person sometimes arrived and found the shelf empty. To solve the problem, volunteers began sending a message the day before each item was due. They also asked people to renew an item online if nobody else had booked it. After a month, more tools were returned on time, and the volunteers kept the reminder system.'
    ],
    vocabulary: [
      word('borrow', ['借', '借入', '借用', '借来', '借进'], '动词，指从别人那里借来物品。例句：Can I borrow a ladder for the weekend?'),
      word('lend', ['借出', '借给', '出借', '借予'], '动词，指把自己的物品借给别人。例句：The centre lends tools to local residents.'),
      word('resident', ['居民', '住户', '居住者', '当地居民', '住民'], '名词，指住在某地的人。例句：Local residents can join the tool library.'),
      word('renew a loan', ['续借', '续借物品', '延长借用期限', '延长借期', '延长借用期', '续期'], '动词短语，表示延长一次借用。例句：You can renew a loan online.'),
      word('reminder', ['提醒', '提醒信息', '提醒消息', '通知提醒', '提醒通知', '提示'], '名词，指提醒人们记住某事的消息或事物。例句：I got a reminder to return the drill.')
    ],
    reading: [
      choice('Why did residents want a tool library?', ['They wanted to sell tools to their neighbours.', 'They needed volunteers to fix their homes.', 'They needed some tools only occasionally.'], 2, '第一段指出许多居民临时需要工具，购买这些工具不划算。'),
      choice('What did the volunteer and borrower check together?', ['The condition of the item.', 'The price of the item.', 'The date the tool library opened.'], 0, '借出前双方查看工具的状况，原文为 “checked its condition”。'),
      choice('When could a borrower renew an item online?', ['When it was already damaged.', 'When no one else had booked it.', 'When the reminder arrived late.'], 1, '续借的前提是 “if nobody else had booked it”。')
    ],
    grammar: [
      choice('If nobody else books the drill, you ___ keep it for another week.', ['had', 'can', 'were'], 1, 'if 从句给出条件，主句用 can 表示在该条件下有权限续借。'),
      choice('More tools ___ on time after the volunteers introduced reminders last month.', ['returned', 'are returned', 'were returned'], 2, '工具是被归还的，且事情发生在过去，所以用一般过去时的被动语态 were returned。')
    ],
    speaking: [talk('Suggest one thing people in your neighbourhood could share. Explain how they could borrow it and what rule would help the system work.', 'My neighbours could share board games. We could keep the games in a box at the community centre. If you want to borrow a game, you write your name and the date on a list. A simple rule would help: return the game within one week so someone else can use it.', '说清共享物品、借用流程和归还规则。用 if 说明符合条件时可以怎么做。')]
  },
  {
    number: 12, title: 'Technology and attention', label: '科技与专注',
    passageTitle: 'Two Ways to Use a Phone',
    passage: [
      'Before a group project, four students tested how their phones affected their study time. For twenty minutes, they answered messages whenever a notification appeared. They completed two slides. In another twenty-minute session, they put their phones on silent and agreed to check them only after the timer rang. This time they completed four slides.',
      'The students knew the test was too small to prove that phones always reduce productivity. The tasks were slightly different, and by the second session, everyone knew the topic better. Still, the students noticed that they could follow each other’s ideas more easily without frequent interruptions. They decided to silence notifications during group work and leave their phones available for tasks such as checking facts or taking photos.'
    ],
    vocabulary: [
      word('notification', ['通知', '消息提示', '通知提示', '提醒', '推送通知'], '名词，在手机上指应用发送的提醒消息。例句：I turned off notifications during class.'),
      word('interruption', ['打断', '干扰', '中断', '打扰'], '名词，指导致某事暂时停下的行为或事件。例句：The frequent interruptions made it hard to read.'),
      word('productivity', ['生产率', '生产力', '工作效率', '效率', '产出效率'], '名词，指完成工作的效率或产量。例句：A quiet workspace may improve productivity.'),
      word('on silent', ['静音', '设置为静音', '处于静音模式', '静音模式', '调成静音'], '介词短语。例句：Please put your phone on silent.'),
      word('check facts', ['核实事实', '核查事实', '查证事实', '核对事实', '事实核查', '核实信息'], '动词短语，表示确认信息是否属实。例句：We checked the facts before sharing the story.')
    ],
    reading: [
      choice('How did the two sessions differ in their results?', ['They finished four slides in the first session and two in the second.', 'They finished twice as many slides in the second session.', 'They finished the same number of slides in both sessions.'], 1, '第一次完成两页，第二次完成四页，所以第二次完成的页数是第一次的两倍。'),
      choice('Which point limited what the students could conclude?', ['The second task took less than twenty minutes.', 'The students had no access to a timer.', 'The tasks were slightly different across the two sessions.'], 2, '第二段提及两次任务略有不同，学生在第二次也更熟悉主题。'),
      choice('How will the students use their phones during future group work?', ['They will silence alerts but use their phones for useful tasks.', 'They will give their phones to their teacher.', 'They will reply to every message as it arrives.'], 0, '他们决定关闭通知，同时仍可用手机核实事实或拍照。')
    ],
    grammar: [
      choice('The group finished ___ slides in the second session than in the first.', ['much', 'more', 'most'], 1, 'than 引出比较对象。数量的比较用 more slides。'),
      choice('Choose the connector that shows a contrast. “___ the test was small, the results helped the students make a decision.”', ['Because', 'So', 'Although'], 2, 'although 引导让步从句，表示测试规模虽小，结果仍带来了实际帮助。')
    ],
    speaking: [talk('How do you use your phone when you study? Give one example of a useful feature, one distraction, and one rule you might try.', 'I use my phone to look up words and take pictures of notes. However, when a message arrives, I often stop reading to answer it. I could turn off message alerts for twenty minutes and check my phone during a break. That way I could still use the dictionary.', '用 however 转到干扰来源，然后给出一个可执行、有时间限制的规则。')]
  },
  {
    number: 13, title: 'Sustainable choices', label: '可持续生活',
    passageTitle: 'Bring a Cup on Tuesday',
    passage: [
      'A campus café wanted to use fewer disposable cups. It first offered a small discount to customers who brought their own cups. After two weeks, staff counted almost the same number of disposable cups as before. Several customers said they owned reusable cups but often left them at home.',
      'The café then tried a different approach. On Tuesday mornings, customers could borrow a clean cup by leaving a small deposit. They got the deposit back when they returned the cup later in the day. The number of disposable cups used on Tuesdays fell, and the staff found that almost everyone brought the borrowed cups back. They still had to wash and store more cups, so they decided to test the system on one additional day before expanding further.'
    ],
    vocabulary: [
      word('disposable', ['一次性的', '用完即弃的', '可丢弃的', '一次性'], '形容词，在文中指用后丢弃的。例句：The café uses fewer disposable cups now.'),
      word('reusable', ['可重复使用的', '可反复使用的', '可再用的', '可重复使用', '可反复使用'], '形容词，表示能用多次。例句：I carry a reusable bottle.'),
      word('discount', ['折扣', '优惠', '打折', '减价'], '名词，指价格上的减免。例句：You can get a small discount if you bring a cup.'),
      word('deposit', ['押金', '保证金', '存款', '定金', '订金'], '名词，在借杯子的语境中指归还后可退回的押金。例句：You get your deposit back when you return the cup.'),
      word('expand', ['扩大', '扩展', '扩张', '拓展'], '动词，表示让某事物规模或范围变大。例句：The café might expand the scheme next month.')
    ],
    reading: [
      choice('Why did some customers keep using disposable cups during the discount trial?', ['They often forgot to bring their own cups.', 'The café banned reusable cups.', 'They had to leave a deposit to get the discount.'], 0, '有些顾客有可重复使用的杯子，但经常忘记从家里带来。'),
      choice('What happened when a customer returned a borrowed cup?', ['They received a new disposable cup.', 'They got their deposit back.', 'They paid a cleaning fee.'], 1, '第二段说明借用当天归还杯子就退还押金。'),
      choice('Why did the café decide to expand the trial gradually?', ['Almost nobody returned a borrowed cup.', 'The discount suddenly became more popular.', 'Staff needed to wash and store additional cups.'], 2, '员工需要清洗、存放更多杯子，所以先增加一天观察效果。')
    ],
    grammar: [
      choice('The café used ___ disposable cups after the change.', ['less', 'fewer', 'fewest'], 1, 'cups 是可数名词复数，数量比过去少用 fewer。'),
      choice('“They got their deposit back when they returned the cup.” What does “when” introduce?', ['The time of the refund.', 'The purpose of the refund.', 'A person who gave the refund.'], 0, 'when 引导时间状语从句，交代了退款发生的时间。')
    ],
    speaking: [talk('Suggest a small change to reduce waste at a café or school. Who would do what? How would you tell whether it was working?', 'My school could add a water station near the sports field. Students could fill their own bottles there instead of buying a new bottle each time. We could count how many single-use bottles are sold before and after the change. We should compare days with similar weather.', '先说明改动和执行者，再给出观察指标。用 before and after 表达对比。')]
  },
  {
    number: 14, title: 'Work and communication', label: '工作与沟通',
    passageTitle: 'A Clearer Handover',
    passage: [
      'Priya worked mornings at a small museum, while Daniel took over in the afternoon. They used a shared notebook to pass on information. One Tuesday, Priya wrote, “Check room three later.” Daniel did not know what he was supposed to check or when it had to happen. He looked for a problem after the last visitors left and found a sign that should have been replaced before a school group arrived.',
      'The next week, they added three columns to the notebook: task, deadline, and person responsible. They also agreed to write a short explanation whenever a task was unusual. When a repair was delayed on Friday, Priya noted which door was affected and which entrance Daniel should open instead. The afternoon group entered on time because Daniel could act without waiting for another message.'
    ],
    vocabulary: [
      word('handover', ['交接', '移交', '交班', '工作交接', '交接班'], '名词，指把工作或职责交给接手的人。例句：The two teams had a short handover.'),
      word('take over', ['接手', '接管', '接替', '接班', '继任'], '动词短语。例句：Daniel takes over in the afternoon.'),
      word('deadline', ['截止日期', '截止时间', '最后期限', '截止期限', '期限', '截止日'], '名词，指完成某事的最后时间。例句：The deadline for the repair is noon.'),
      word('responsible for', ['对……负责', '对…负责', '对某事负责', '负责', '负责某事', '承担责任', '对某事负有责任'], '形容词短语，后面可接名词或动名词。例句：Daniel is responsible for opening the side door.'),
      word('delay a repair', ['推迟维修', '延迟维修', '耽误维修', '延后维修', '推迟修理', '拖延维修'], '动词短语。例句：Rain delayed the repair.')
    ],
    reading: [
      choice('What was missing from the original note about room three?', ['The room number.', 'The details of what to check and when.', 'The name of the shared notebook.'], 1, '原便条列出房间号，但没有交代具体查看什么和完成时间。'),
      choice('What extra information did they decide to include for unusual tasks?', ['A photo of the museum.', 'A list of all visitors.', 'A short explanation.'], 2, '第二段明确说不常见的任务需要写简短说明。'),
      choice('Why could the afternoon group enter on time on Friday?', ['Daniel knew which entrance to open instead.', 'The repair had finished ahead of schedule.', 'Priya stayed at work to open the original door.'], 0, '便条写清受影响的门和可用的替代入口，丹尼尔能立即行动。')
    ],
    grammar: [
      choice('Choose the correct word order. “Daniel did not know ___.”', ['when did the group arrive', 'when the group would arrive', 'when would the group arrive'], 1, '宾语从句用陈述语序，when 后接主语 the group，再接谓语 would arrive。'),
      choice('We need a person who ___ responsible for opening the side door.', ['is', 'are', 'be'], 0, '关系从句的主语 who 指代 a person，是单数，所以用 is。')
    ],
    speaking: [talk('Leave a spoken handover for someone taking over a club event. Describe one unfinished task, who should do it, the deadline, and why it matters.', 'Hi, Alex. Could you put the name cards on the tables before three? You will find them in a blue folder by the door. We need them before the guests arrive because each guest has a place. I have already put the room signs up.', '让接手的人能直接行动。交代谁做、做什么、何时完成和材料位置。')]
  },
  {
    number: 15, title: 'Media and evidence', label: '媒体与证据',
    passageTitle: 'The Photo of the Empty Pool',
    passage: [
      'A photo of an empty public pool appeared on a neighbourhood forum. Its caption claimed that the pool had closed for the whole summer. Omar nearly forwarded it, but he noticed a date on a sign in the background. The date was from the previous year. He checked the recreation centre’s website and found a notice saying the pool would close for only three days the following week.',
      'Omar called the centre to make sure the notice was current. A staff member confirmed the dates and explained that the pool was being cleaned. Omar replied to the forum post with a link to the current notice. The person who had shared the photo thanked him and corrected the caption. Omar now checks a claim against its original source before sharing it.'
    ],
    vocabulary: [
      word('caption', ['图片说明', '图注', '图片文字说明', '说明文字', '配文', '字幕'], '名词，指图片旁边或画面上的说明文字。例句：The caption gave the date of the photo.'),
      word('claim', ['声称', '宣称', '主张', '断言', '说法', '声明'], '可作名词或动词，表示提出一项有待核实的说法。例句：She checked the claim before sharing it.'),
      word('forward a message', ['转发消息', '转发信息', '转发一条消息', '转寄消息', '转发一条信息'], '动词短语。例句：Please forward the message to the group.'),
      word('verify', ['核实', '验证', '证实', '查证', '核验', '确认'], '动词，指检查并确认是否属实。例句：I called the office to verify the date.'),
      word('original source', ['原始来源', '原始出处', '最初来源', '第一手来源', '原始信源', '原始资料来源'], '名词短语，指信息最初发布或产生的地方。例句：Read the original source before you share a claim.')
    ],
    reading: [
      choice('What first made Omar question the caption?', ['A staff member posted a correction.', 'The photo showed the wrong pool.', 'A sign in the picture showed a date from the previous year.'], 2, '他先注意到照片背景中的年份比当前年份早一年。'),
      choice('What did the current notice say?', ['The pool would close for three days the following week.', 'The pool would remain open without interruption.', 'The pool would be closed all summer.'], 0, '官网通知写的是下周关闭三天。'),
      choice('Why did Omar call the recreation centre?', ['To reserve a time to swim.', 'To confirm the website notice was up to date.', 'To find out who had taken the photo.'], 1, '第二段说明电话是为了确认官网通知依然有效。')
    ],
    grammar: [
      choice('Report this statement from last week using standard backshift. “The pool will close on Tuesday.”', ['They said the pool closes the Tuesday before.', 'They said the pool has closed the following Tuesday.', 'They said the pool would close on Tuesday.'], 2, '用过去时 said 引出间接引语并按时态后移规则转换时，will 变为 would。'),
      choice('The photo ___ Omar saw was from the previous year.', ['where', 'that', 'who'], 1, '先行词 the photo 指物。关系代词 that 在从句中作 saw 的宾语。')
    ],
    speaking: [talk('Imagine a message claims your local library is closing. Explain how you would check it and what reply you might write if it was incorrect.', 'First, I would check the date on the message and look at the library website. If the page was unclear, I would call the library. Then I might reply, “The library says it will be closed on Monday only. Here is the current notice.” I would include a link so others could check.', '用 first、if 和 then 说明核实顺序。回复时写明你查到的事实及其出处。')]
  },
  {
    number: 16, title: 'Reflecting on progress', label: '回顾与改进',
    passageTitle: 'What the Numbers Missed',
    passage: [
      'At the end of an English course, Henry compared his first and last practice records. Both records showed eight correct answers out of ten. At first, he felt disappointed because the percentages were identical. Then he looked at the questions. The first set had short sentences with familiar words. The last set included a longer passage and asked him to explain what the writer implied.',
      'Henry also compared his notes on errors. Early in the course, he often missed questions because he skimmed too quickly. Later, he marked the sentences that supported his choices. His two final errors came from confusing words with similar meanings. Henry decided to keep marking evidence while practising word pairs such as “borrow” and “lend.” His notes gave him a clearer plan than the percentage alone.'
    ],
    vocabulary: [
      word('compare', ['比较', '对比', '比对', '相比'], '动词，compare A with B 表示把 A 与 B 比较。例句：I compared my first result with my latest result.'),
      word('imply', ['暗示', '含有', '意味着', '隐含', '暗含'], '动词，表示没有直接说出，但让读者或听者推知。例句：The sentence implies that he was surprised.'),
      word('skim a passage', ['略读文章', '快速浏览文章', '浏览一篇文章', '略读一段文章', '快速阅读一段文章', '快速浏览一篇文章', '快速浏览短文', '略读短文'], '动词短语。skim 指为快速了解大意而浏览。例句：I skimmed the passage to find its main idea.'),
      word('evidence', ['证据', '依据', '佐证', '证明材料'], '通常为不可数名词。例句：Find evidence in the passage to support your answer.'),
      word('confuse A with B', ['把A和B混淆', '把A误当成B', '混淆A和B', '把A与B混淆', '将A与B混淆', '把A和B搞混', '混淆A与B'], '动词短语。例句：I sometimes confuse borrow with lend.')
    ],
    reading: [
      choice('Why did the same percentage conceal some of Henry’s progress?', ['The final questions asked for more difficult reading skills.', 'The first record was calculated incorrectly.', 'Henry had fewer questions to answer in his final session.'], 0, '两次同为八题正确，最后一组阅读更长，还要求判断作者的言外之意。'),
      choice('What did Henry start doing to support his reading answers?', ['He used a dictionary for every word.', 'He marked sentences that supported his choices.', 'He answered the longest questions first.'], 1, '第二段强调他后来会找出并标记支撑选项的句子。'),
      choice('What will Henry focus on next?', ['Reading only short passages with familiar words.', 'Skimming more quickly to finish early.', 'Finding evidence and practising pairs of similar words.'], 2, '他计划继续找依据，同时强化练习容易混淆的词对。')
    ],
    grammar: [
      choice('I started this course in September, and it is still running. I ___ ten practice sets so far.', ['completed yesterday', 'complete yesterday', 'have completed'], 2, 'so far 表示从过去到现在的累计结果，这里用现在完成时 have completed。'),
      choice('Henry’s plan is clearer now because he ___ his error notes yesterday.', ['reviewed', 'has reviewed', 'reviews'], 0, 'yesterday 标明动作发生在一个已经结束的过去时间，应用一般过去时 reviewed。')
    ],
    speaking: [talk('Reflect on your English progress. What has improved, which error still appears, and what will you practise next week? Give an example from your own work.', 'I have become better at finding the main idea in a long passage. Last week, I still chose an answer too quickly because I missed the word “except.” Next week, I will underline key words in each question and check my answer against one sentence in the passage.', '用现在完成时回顾进步，用一般过去时讲述具体失误，最后用 will 说明下周的行动。')]
  }
];
