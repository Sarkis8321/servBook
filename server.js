const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database/init');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: 'php-course-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Middleware для проверки авторизации
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

const requireTeacher = (req, res, next) => {
  if (!req.session.userId || req.session.userRole !== 'teacher') {
    return res.redirect('/');
  }
  next();
};

// Главная страница
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

// Регистрация
app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  
  if (!username || !password) {
    return res.render('register', { error: 'Заполните все поля' });
  }
  
  if (!['student', 'teacher'].includes(role)) {
    return res.render('register', { error: 'Неверная роль' });
  }
  
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashedPassword, role);
    res.redirect('/login');
  } catch (err) {
    res.render('register', { error: 'Пользователь с таким именем уже существует' });
  }
});

// Вход
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('login', { error: 'Неверное имя пользователя или пароль' });
  }
  
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.userRole = user.role;
  
  res.redirect(user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
});

// Выход
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Личный кабинет студента
app.get('/dashboard', requireAuth, (req, res) => {
  const modules = db.prepare('SELECT * FROM modules ORDER BY order_index').all();
  const progress = db.prepare(`
    SELECT module_id, COUNT(*) as completed_count, MAX(score) as best_score
    FROM user_progress 
    WHERE user_id = ? 
    GROUP BY module_id
  `).all(req.session.userId);
  
  const progressMap = {};
  progress.forEach(p => {
    progressMap[p.module_id] = { completed: p.completed_count, best_score: p.best_score };
  });
  
  const finalTestProgress = db.prepare(`
    SELECT COUNT(*) as completed_count, MAX(score) as best_score
    FROM user_progress 
    WHERE user_id = ? AND test_id IN (SELECT id FROM questions WHERE is_final_test = 1)
  `).get(req.session.userId);
  
  res.render('dashboard', {
    user: { id: req.session.userId, username: req.session.username, role: req.session.userRole },
    modules,
    progress: progressMap,
    finalTestProgress: finalTestProgress || { completed_count: 0, best_score: 0 }
  });
});

// Просмотр модуля
app.get('/module/:id', requireAuth, (req, res) => {
  const moduleId = parseInt(req.params.id);
  const module = db.prepare('SELECT * FROM modules WHERE id = ?').get(moduleId);
  
  if (!module) {
    return res.status(404).send('Модуль не найден');
  }
  
  const completedTests = db.prepare(`
    SELECT COUNT(*) as count FROM user_progress 
    WHERE user_id = ? AND module_id = ?
  `).get(req.session.userId, moduleId);
  
  res.render('module', {
    user: { id: req.session.userId, username: req.session.username, role: req.session.userRole },
    module,
    completedTests: completedTests.count
  });
});

// Страница теста для модуля
app.get('/module/:id/test', requireAuth, (req, res) => {
  const moduleId = parseInt(req.params.id);
  
  const questions = db.prepare(`
    SELECT q.id, q.question_text, q.question_type
    FROM questions q
    WHERE q.module_id = ? AND q.is_final_test = 0
  `).all(moduleId);
  
  const questionsWithAnswers = questions.map(q => {
    const answers = db.prepare('SELECT id, answer_text FROM answers WHERE question_id = ?').all(q.id);
    return { ...q, answers };
  });
  
  res.render('test', {
    user: { id: req.session.userId, username: req.session.username, role: req.session.userRole },
    moduleId,
    questions: questionsWithAnswers,
    isFinal: false
  });
});

// Итоговый тест
app.get('/final-test', requireAuth, (req, res) => {
  const questions = db.prepare(`
    SELECT q.id, q.question_text, q.question_type
    FROM questions q
    WHERE q.is_final_test = 1
  `).all();
  
  const questionsWithAnswers = questions.map(q => {
    const answers = db.prepare('SELECT id, answer_text FROM answers WHERE question_id = ?').all(q.id);
    return { ...q, answers };
  });
  
  res.render('test', {
    user: { id: req.session.userId, username: req.session.username, role: req.session.userRole },
    moduleId: null,
    questions: questionsWithAnswers,
    isFinal: true
  });
});

// Отправка теста
app.post('/submit-test', requireAuth, (req, res) => {
  const { moduleId, answers, isFinal } = req.body;
  
  let totalQuestions = 0;
  let correctAnswers = 0;
  
  const insertProgress = db.prepare(`
    INSERT INTO user_progress (user_id, module_id, test_id, score) VALUES (?, ?, ?, ?)
  `);
  
  const insertUserAnswer = db.prepare(`
    INSERT INTO user_answers (user_progress_id, question_id, selected_answer, is_correct) VALUES (?, ?, ?, ?)
  `);
  
  for (const [questionId, selectedAnswers] of Object.entries(answers)) {
    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(parseInt(questionId));
    if (!question) continue;
    
    totalQuestions++;
    
    // Нормализуем selectedAnswers в массив
    let selectedAnswersArray = [];
    if (Array.isArray(selectedAnswers)) {
      selectedAnswersArray = selectedAnswers;
    } else if (typeof selectedAnswers === 'string') {
      selectedAnswersArray = [selectedAnswers];
    } else if (selectedAnswers === undefined || selectedAnswers === null) {
      selectedAnswersArray = [];
    } else {
      selectedAnswersArray = [String(selectedAnswers)];
    }
    
    const correctAnswersForQuestion = db.prepare('SELECT answer_text FROM answers WHERE question_id = ? AND is_correct = 1').all(questionId);
    const correctAnswerTexts = correctAnswersForQuestion.map(a => a.answer_text);
    
    let isCorrect = false;
    if (question.question_type === 'single') {
      const selectedAnswer = db.prepare('SELECT answer_text FROM answers WHERE id = ?').get(parseInt(selectedAnswersArray[0]));
      isCorrect = selectedAnswer && correctAnswerTexts.includes(selectedAnswer.answer_text);
    } else if (question.question_type === 'multiple') {
      const selectedAnswerTexts = selectedAnswersArray.map(id => {
        const ans = db.prepare('SELECT answer_text FROM answers WHERE id = ?').get(parseInt(id));
        return ans ? ans.answer_text : null;
      }).filter(a => a !== null);
      
      isCorrect = selectedAnswerTexts.length === correctAnswerTexts.length &&
                  selectedAnswerTexts.every(a => correctAnswerTexts.includes(a));
    }
    
    if (isCorrect) {
      correctAnswers++;
    }
    
    const progressId = insertProgress.run(req.session.userId, moduleId ? parseInt(moduleId) : null, parseInt(questionId), isCorrect ? 1 : 0).lastInsertRowid;
    insertUserAnswer.run(progressId, parseInt(questionId), JSON.stringify(selectedAnswers), isCorrect ? 1 : 0);
  }
  
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  
  // Обновляем общий балл за модуль/тест
  if (moduleId) {
    db.prepare(`
      UPDATE user_progress SET score = ? 
      WHERE user_id = ? AND module_id = ? AND test_id = ?
    `).run(score, req.session.userId, parseInt(moduleId), parseInt(Object.keys(answers)[0]));
  }
  
  res.render('test-result', {
    user: { id: req.session.userId, username: req.session.username, role: req.session.userRole },
    score,
    totalQuestions,
    correctAnswers,
    isFinal: isFinal === 'true'
  });
});

// Кабинет учителя
app.get('/teacher/dashboard', requireTeacher, (req, res) => {
  const students = db.prepare('SELECT id, username, created_at FROM users WHERE role = ?').all('student');
  
  const studentsWithProgress = students.map(student => {
    const completedModules = db.prepare(`
      SELECT COUNT(DISTINCT module_id) as count FROM user_progress WHERE user_id = ?
    `).get(student.id);
    
    const finalTestScore = db.prepare(`
      SELECT MAX(score) as score FROM user_progress 
      WHERE user_id = ? AND test_id IN (SELECT id FROM questions WHERE is_final_test = 1)
    `).get(student.id);
    
    return {
      ...student,
      completedModules: completedModules.count,
      finalTestScore: finalTestScore.score || 0
    };
  });
  
  res.render('teacher-dashboard', {
    user: { id: req.session.userId, username: req.session.username, role: req.session.userRole },
    students: studentsWithProgress
  });
});

// Просмотр успеваемости студента
app.get('/teacher/student/:id', requireTeacher, (req, res) => {
  const studentId = parseInt(req.params.id);
  const student = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(studentId, 'student');
  
  if (!student) {
    return res.status(404).send('Студент не найден');
  }
  
  const modules = db.prepare('SELECT * FROM modules ORDER BY order_index').all();
  
  const progress = db.prepare(`
    SELECT up.module_id, m.title, up.score, up.completed_at
    FROM user_progress up
    JOIN modules m ON up.module_id = m.id
    WHERE up.user_id = ?
    GROUP BY up.module_id
  `).all(studentId);
  
  const finalTestResults = db.prepare(`
    SELECT MAX(score) as score, completed_at
    FROM user_progress 
    WHERE user_id = ? AND test_id IN (SELECT id FROM questions WHERE is_final_test = 1)
  `).get(studentId);
  
  res.render('teacher-student', {
    user: { id: req.session.userId, username: req.session.username, role: req.session.userRole },
    student,
    modules,
    progress,
    finalTestResult: finalTestResults
  });
});

// Управление вопросами (добавление/редактирование)
app.get('/teacher/questions', requireTeacher, (req, res) => {
  const modules = db.prepare('SELECT * FROM modules ORDER BY order_index').all();
  const allQuestions = db.prepare(`
    SELECT q.*, m.title as module_title
    FROM questions q
    LEFT JOIN modules m ON q.module_id = m.id
    ORDER BY q.is_final_test DESC, q.module_id, q.id
  `).all();
  
  res.render('teacher-questions', {
    user: { id: req.session.userId, username: req.session.username, role: req.session.userRole },
    modules,
    questions: allQuestions
  });
});

// Добавление вопроса
app.post('/teacher/questions/add', requireTeacher, (req, res) => {
  const { module_id, question_text, question_type, is_final_test, answers } = req.body;
  
  const insertQuestion = db.prepare('INSERT INTO questions (module_id, question_text, question_type, is_final_test) VALUES (?, ?, ?, ?)');
  const insertAnswer = db.prepare('INSERT INTO answers (question_id, answer_text, is_correct) VALUES (?, ?, ?)');
  
  const questionId = insertQuestion.run(
    module_id ? parseInt(module_id) : null,
    question_text,
    question_type,
    is_final_test === 'on' ? 1 : 0
  ).lastInsertRowid;
  
  if (answers) {
    const answerList = Array.isArray(answers) ? answers : [answers];
    answerList.forEach((answer, index) => {
      const isCorrect = req.body[`is_correct_${index}`] === 'on' ? 1 : 0;
      insertAnswer.run(questionId, answer, isCorrect);
    });
  }
  
  res.redirect('/teacher/questions');
});

// Удаление вопроса
app.post('/teacher/questions/delete/:id', requireTeacher, (req, res) => {
  const questionId = parseInt(req.params.id);
  db.prepare('DELETE FROM answers WHERE question_id = ?').run(questionId);
  db.prepare('DELETE FROM questions WHERE id = ?').run(questionId);
  res.redirect('/teacher/questions');
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log('Учитель по умолчанию: login=teacher, password=teacher123');
});
