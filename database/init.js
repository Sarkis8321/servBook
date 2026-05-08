const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'php_course.db');
const db = new Database(dbPath);

// Создание таблиц
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'teacher')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK(question_type IN ('single', 'multiple', 'text')),
    is_final_test INTEGER DEFAULT 0,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    answer_text TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    test_id INTEGER,
    score REAL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_progress_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    selected_answer TEXT,
    is_correct INTEGER DEFAULT 0,
    FOREIGN KEY (user_progress_id) REFERENCES user_progress(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );
`);

// Проверка наличия учителя, если нет - создаем
const teacherCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('teacher');
if (teacherCount.count === 0) {
  const hashedPassword = bcrypt.hashSync('teacher123', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('teacher', hashedPassword, 'teacher');
  console.log('Создан учитель по умолчанию: login=teacher, password=teacher123');
}

// Добавление модулей по курсу PHP, если база пустая
const moduleCount = db.prepare('SELECT COUNT(*) as count FROM modules').get();
if (moduleCount.count === 0) {
  const modules = [
    {
      title: 'Введение в PHP',
      description: 'Основы языка программирования PHP, история, синтаксис',
      order_index: 1,
      content: `
        <h2>Введение в PHP</h2>
        <h3>Что такое PHP?</h3>
        <p>PHP (Hypertext Preprocessor) — это серверный язык скриптов, предназначенный для создания динамических веб-страниц.</p>
        
        <h3>История PHP</h3>
        <p>PHP был создан Расмусом Лердорфом в 1994 году. С тех пор язык прошел через множество версий и стал одним из самых популярных языков для веб-разработки.</p>
        
        <h3>Синтаксис PHP</h3>
        <p>Код PHP заключается в теги <code>&lt;?php ... ?&gt;</code></p>
        
        <pre><code>
&lt;?php
  echo "Hello, World!";
?&gt;
        </code></pre>
        
        <h3>Переменные в PHP</h3>
        <p>Переменные в PHP начинаются со знака $:</p>
        <pre><code>
&lt;?php
  $name = "John";
  $age = 25;
  echo "My name is $name and I am $age years old";
?&gt;
        </code></pre>
        
        <h3>Типы данных</h3>
        <ul>
          <li>String (строки)</li>
          <li>Integer (целые числа)</li>
          <li>Float (числа с плавающей точкой)</li>
          <li>Boolean (логический тип)</li>
          <li>Array (массивы)</li>
          <li>Object (объекты)</li>
          <li>NULL</li>
        </ul>
      `
    },
    {
      title: 'Управляющие конструкции',
      description: 'Условные операторы, циклы и другие управляющие конструкции',
      order_index: 2,
      content: `
        <h2>Управляющие конструкции</h2>
        
        <h3>Условные операторы</h3>
        <pre><code>
&lt;?php
  $age = 18;
  
  if ($age >= 18) {
    echo "Вы совершеннолетний";
  } else {
    echo "Вы несовершеннолетний";
  }
  
  // elseif
  $score = 85;
  if ($score >= 90) {
    echo "Отлично";
  } elseif ($score >= 75) {
    echo "Хорошо";
  } else {
    echo "Удовлетворительно";
  }
?&gt;
        </code></pre>
        
        <h3>Циклы</h3>
        <h4>Цикл for</h4>
        <pre><code>
&lt;?php
  for ($i = 0; $i < 5; $i++) {
    echo "Iteration: $i<br>";
  }
?&gt;
        </code></pre>
        
        <h4>Цикл while</h4>
        <pre><code>
&lt;?php
  $i = 0;
  while ($i < 5) {
    echo "While iteration: $i<br>";
    $i++;
  }
?&gt;
        </code></pre>
        
        <h4>Цикл foreach</h4>
        <pre><code>
&lt;?php
  $fruits = ["apple", "banana", "orange"];
  foreach ($fruits as $fruit) {
    echo "$fruit<br>";
  }
?&gt;
        </code></pre>
        
        <h3>Оператор switch</h3>
        <pre><code>
&lt;?php
  $day = "Monday";
  switch ($day) {
    case "Monday":
      echo "Понедельник";
      break;
    case "Tuesday":
      echo "Вторник";
      break;
    default:
      echo "Другой день";
  }
?&gt;
        </code></pre>
      `
    },
    {
      title: 'Функции в PHP',
      description: 'Создание и использование функций, параметры, возвращаемые значения',
      order_index: 3,
      content: `
        <h2>Функции в PHP</h2>
        
        <h3>Объявление функции</h3>
        <pre><code>
&lt;?php
  function sayHello($name) {
    return "Hello, $name!";
  }
  
  echo sayHello("John");
?&gt;
        </code></pre>
        
        <h3>Параметры по умолчанию</h3>
        <pre><code>
&lt;?php
  function greet($name = "Guest") {
    return "Hello, $name!";
  }
  
  echo greet(); // Hello, Guest!
  echo greet("Alice"); // Hello, Alice!
?&gt;
        </code></pre>
        
        <h3>Возврат нескольких значений</h3>
        <pre><code>
&lt;?php
  function getMinMax($a, $b) {
    return [min($a, $b), max($a, $b)];
  }
  
  list($min, $max) = getMinMax(10, 20);
  echo "Min: $min, Max: $max";
?&gt;
        </code></pre>
        
        <h3>Анонимные функции</h3>
        <pre><code>
&lt;?php
  $greet = function($name) {
    return "Hello, $name!";
  };
  
  echo $greet("Bob");
?&gt;
        </code></pre>
        
        <h3>Стрелочные функции (PHP 7.4+)</h3>
        <pre><code>
&lt;?php
  $multiply = fn($a, $b) => $a * $b;
  echo $multiply(5, 3); // 15
?&gt;
        </code></pre>
      `
    },
    {
      title: 'Массивы в PHP',
      description: 'Работа с массивами: создание, обработка, многомерные массивы',
      order_index: 4,
      content: `
        <h2>Массивы в PHP</h2>
        
        <h3>Индексированные массивы</h3>
        <pre><code>
&lt;?php
  $fruits = ["apple", "banana", "orange"];
  echo $fruits[0]; // apple
?&gt;
        </code></pre>
        
        <h3>Ассоциативные массивы</h3>
        <pre><code>
&lt;?php
  $person = [
    "name" => "John",
    "age" => 25,
    "city" => "New York"
  ];
  
  echo $person["name"]; // John
?&gt;
        </code></pre>
        
        <h3>Многомерные массивы</h3>
        <pre><code>
&lt;?php
  $students = [
    ["name" => "John", "grade" => 90],
    ["name" => "Jane", "grade" => 85],
    ["name" => "Bob", "grade" => 78]
  ];
  
  echo $students[1]["name"]; // Jane
?&gt;
        </code></pre>
        
        <h3>Функции для работы с массивами</h3>
        <pre><code>
&lt;?php
  $numbers = [1, 2, 3, 4, 5];
  
  // count - количество элементов
  echo count($numbers); // 5
  
  // array_push - добавить элемент
  array_push($numbers, 6);
  
  // array_pop - удалить последний элемент
  array_pop($numbers);
  
  // array_merge - объединение массивов
  $arr1 = [1, 2];
  $arr2 = [3, 4];
  $merged = array_merge($arr1, $arr2);
  
  // sort - сортировка
  sort($numbers);
  
  // array_map - применение функции к каждому элементу
  $squared = array_map(fn($n) => $n ** 2, $numbers);
?&gt;
        </code></pre>
      `
    },
    {
      title: 'Работа с формами и данными',
      description: 'Обработка данных форм, работа с $_GET, $_POST, $_SESSION',
      order_index: 5,
      content: `
        <h2>Работа с формами и данными</h2>
        
        <h3>Суперглобальные массивы</h3>
        <ul>
          <li><code>$_GET</code> - данные из URL</li>
          <li><code>$_POST</code> - данные из формы методом POST</li>
          <li><code>$_SESSION</code> - данные сессии</li>
          <li><code>$_COOKIE</code> - cookie</li>
          <li><code>$_FILES</code> - загруженные файлы</li>
        </ul>
        
        <h3>Обработка формы</h3>
        <pre><code>
&lt;?php
  if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = htmlspecialchars($_POST["name"]);
    $email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
    
    echo "Name: $name<br>";
    echo "Email: $email";
  }
?&gt;

&lt;form method="POST" action=""&gt;
  &lt;input type="text" name="name" placeholder="Your name"&gt;
  &lt;input type="email" name="email" placeholder="Your email"&gt;
  &lt;button type="submit"&gt;Submit&lt;/button&gt;
&lt;/form&gt;
        </code></pre>
        
        <h3>Сессии</h3>
        <pre><code>
&lt;?php
  session_start();
  
  // Установка переменной сессии
  $_SESSION["user"] = "John";
  
  // Получение переменной сессии
  echo $_SESSION["user"];
  
  // Удаление переменной сессии
  unset($_SESSION["user"]);
  
  // Уничтожение сессии
  session_destroy();
?&gt;
        </code></pre>
        
        <h3>Cookie</h3>
        <pre><code>
&lt;?php
  // Установка cookie (имя, значение, время жизни)
  setcookie("user", "John", time() + 3600);
  
  // Получение cookie
  if (isset($_COOKIE["user"])) {
    echo $_COOKIE["user"];
  }
  
  // Удаление cookie
  setcookie("user", "", time() - 3600);
?&gt;
        </code></pre>
      `
    },
    {
      title: 'Работа с базой данных',
      description: 'Подключение к БД, выполнение запросов, PDO',
      order_index: 6,
      content: `
        <h2>Работа с базой данных</h2>
        
        <h3>Подключение через PDO</h3>
        <pre><code>
&lt;?php
  $dsn = "mysql:host=localhost;dbname=mydb;charset=utf8";
  $username = "root";
  $password = "";
  
  try {
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connected successfully";
  } catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
  }
?&gt;
        </code></pre>
        
        <h3>Выполнение SELECT запроса</h3>
        <pre><code>
&lt;?php
  $stmt = $pdo->query("SELECT * FROM users");
  $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
  
  foreach ($users as $user) {
    echo $user["name"] . "<br>";
  }
?&gt;
        </code></pre>
        
        <h3>Подготовленные выражения (защита от SQL инъекций)</h3>
        <pre><code>
&lt;?php
  $stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
  $stmt->execute(['id' => $userId]);
  $user = $stmt->fetch();
?&gt;
        </code></pre>
        
        <h3>INSERT запрос</h3>
        <pre><code>
&lt;?php
  $stmt = $pdo->prepare("INSERT INTO users (name, email) VALUES (:name, :email)");
  $stmt->execute([
    'name' => $name,
    'email' => $email
  ]);
  
  $lastId = $pdo->lastInsertId();
?&gt;
        </code></pre>
        
        <h3>UPDATE запрос</h3>
        <pre><code>
&lt;?php
  $stmt = $pdo->prepare("UPDATE users SET email = :email WHERE id = :id");
  $stmt->execute([
    'email' => $newEmail,
    'id' => $userId
  ]);
?&gt;
        </code></pre>
        
        <h3>DELETE запрос</h3>
        <pre><code>
&lt;?php
  $stmt = $pdo->prepare("DELETE FROM users WHERE id = :id");
  $stmt->execute(['id' => $userId]);
?&gt;
        </code></pre>
      `
    },
    {
      title: 'Объектно-ориентированное программирование',
      description: 'Классы, объекты, наследование, инкапсуляция, полиморфизм',
      order_index: 7,
      content: `
        <h2>Объектно-ориентированное программирование</h2>
        
        <h3>Создание класса и объекта</h3>
        <pre><code>
&lt;?php
  class Person {
    public $name;
    private $age;
    
    public function __construct($name, $age) {
      $this->name = $name;
      $this->age = $age;
    }
    
    public function greet() {
      return "Hello, my name is {$this->name}";
    }
    
    public function getAge() {
      return $this->age;
    }
  }
  
  $person = new Person("John", 25);
  echo $person->greet();
?&gt;
        </code></pre>
        
        <h3>Наследование</h3>
        <pre><code>
&lt;?php
  class Student extends Person {
    private $grade;
    
    public function __construct($name, $age, $grade) {
      parent::__construct($name, $age);
      $this->grade = $grade;
    }
    
    public function study() {
      return "{$this->name} is studying";
    }
  }
  
  $student = new Student("Jane", 20, "A");
  echo $student->greet();
  echo $student->study();
?&gt;
        </code></pre>
        
        <h3>Абстрактные классы</h3>
        <pre><code>
&lt;?php
  abstract class Animal {
    abstract public function makeSound();
    
    public function sleep() {
      return "Sleeping...";
    }
  }
  
  class Dog extends Animal {
    public function makeSound() {
      return "Woof!";
    }
  }
  
  $dog = new Dog();
  echo $dog->makeSound();
?&gt;
        </code></pre>
        
        <h3>Интерфейсы</h3>
        <pre><code>
&lt;?php
  interface Flyable {
    public function fly();
  }
  
  class Bird implements Flyable {
    public function fly() {
      return "Flying high!";
    }
  }
  
  $bird = new Bird();
  echo $bird->fly();
?&gt;
        </code></pre>
        
        <h3>Статические методы и свойства</h3>
        <pre><code>
&lt;?php
  class Math {
    public static $pi = 3.14159;
    
    public static function add($a, $b) {
      return $a + $b;
    }
  }
  
  echo Math::$pi;
  echo Math::add(5, 3);
?&gt;
        </code></pre>
      `
    },
    {
      title: 'Безопасность в PHP',
      description: 'Защита от уязвимостей, валидация данных, хеширование паролей',
      order_index: 8,
      content: `
        <h2>Безопасность в PHP</h2>
        
        <h3>XSS (Cross-Site Scripting)</h3>
        <pre><code>
&lt;?php
  // Защита от XSS
  $userInput = $_GET["input"];
  $safeInput = htmlspecialchars($userInput, ENT_QUOTES, 'UTF-8');
  echo $safeInput;
?&gt;
        </code></pre>
        
        <h3>SQL Инъекции</h3>
        <pre><code>
&lt;?php
  // Используйте подготовленные выражения
  $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email");
  $stmt->execute(['email' => $email]);
?&gt;
        </code></pre>
        
        <h3>Хеширование паролей</h3>
        <pre><code>
&lt;?php
  // Хеширование пароля
  $password = "user_password";
  $hash = password_hash($password, PASSWORD_DEFAULT);
  
  // Проверка пароля
  if (password_verify($password, $hash)) {
    echo "Password is correct!";
  }
?&gt;
        </code></pre>
        
        <h3>CSRF (Cross-Site Request Forgery)</h3>
        <pre><code>
&lt;?php
  // Генерация токена
  session_start();
  if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
  }
  
  // В форме
  // &lt;input type="hidden" name="csrf_token" value="&lt;?php echo $_SESSION['csrf_token']; ?&gt;"&gt;
  
  // Проверка токена
  if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
    die("CSRF validation failed");
  }
?&gt;
        </code></pre>
        
        <h3>Валидация данных</h3>
        <pre><code>
&lt;?php
  // Валидация email
  $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
  
  // Валидация URL
  $url = filter_input(INPUT_POST, 'url', FILTER_VALIDATE_URL);
  
  // Валидация числа
  $age = filter_input(INPUT_POST, 'age', FILTER_VALIDATE_INT);
  
  // Санитизация
  $clean = filter_var($dirty, FILTER_SANITIZE_STRING);
?&gt;
        </code></pre>
        
        <h3>Загрузка файлов</h3>
        <pre><code>
&lt;?php
  $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  $maxSize = 5 * 1024 * 1024; // 5MB
  
  if ($_FILES['file']['error'] === UPLOAD_ERR_OK) {
    if (in_array($_FILES['file']['type'], $allowedTypes) 
        && $_FILES['file']['size'] <= $maxSize) {
      move_uploaded_file($_FILES['file']['tmp_name'], 'uploads/' . $_FILES['file']['name']);
    }
  }
?&gt;
        </code></pre>
      `
    }
  ];

  const insertModule = db.prepare('INSERT INTO modules (title, description, content, order_index) VALUES (?, ?, ?, ?)');
  
  modules.forEach(module => {
    insertModule.run(module.title, module.description, module.content, module.order_index);
  });

  console.log('Модули курса добавлены');

  // Добавление тестовых вопросов для каждого модуля
  const insertQuestion = db.prepare('INSERT INTO questions (module_id, question_text, question_type, is_final_test) VALUES (?, ?, ?, ?)');
  const insertAnswer = db.prepare('INSERT INTO answers (question_id, answer_text, is_correct) VALUES (?, ?, ?)');

  const questionsData = [
    // Модуль 1: Введение в PHP
    {
      moduleId: 1,
      questions: [
        {
          text: 'Что означает аббревиатура PHP?',
          type: 'single',
          answers: [
            { text: 'Personal Home Page', correct: false },
            { text: 'Hypertext Preprocessor', correct: true },
            { text: 'PHP Hypertext Processor', correct: false },
            { text: 'Both B and C', correct: true }
          ]
        },
        {
          text: 'Какой тег используется для начала PHP кода?',
          type: 'single',
          answers: [
            { text: '<script>', correct: false },
            { text: '<?php', correct: true },
            { text: '<php>', correct: false },
            { text: '<%= %>', correct: false }
          ]
        },
        {
          text: 'Как объявить переменную в PHP?',
          type: 'single',
          answers: [
            { text: 'variable $name;', correct: false },
            { text: '$name;', correct: false },
            { text: '$name = value;', correct: true },
            { text: 'var name;', correct: false }
          ]
        },
        {
          text: 'Какие типы данных существуют в PHP?',
          type: 'multiple',
          answers: [
            { text: 'Integer', correct: true },
            { text: 'String', correct: true },
            { text: 'Boolean', correct: true },
            { text: 'All of the above', correct: true }
          ]
        }
      ]
    },
    // Модуль 2: Управляющие конструкции
    {
      moduleId: 2,
      questions: [
        {
          text: 'Какой оператор используется для сравнения значения и типа?',
          type: 'single',
          answers: [
            { text: '==', correct: false },
            { text: '=', correct: false },
            { text: '===', correct: true },
            { text: '!==', correct: false }
          ]
        },
        {
          text: 'Какой цикл гарантированно выполнится хотя бы один раз?',
          type: 'single',
          answers: [
            { text: 'for', correct: false },
            { text: 'while', correct: false },
            { text: 'do-while', correct: true },
            { text: 'foreach', correct: false }
          ]
        },
        {
          text: 'Для чего используется оператор break?',
          type: 'single',
          answers: [
            { text: 'Пропустить одну итерацию', correct: false },
            { text: 'Выйти из цикла или switch', correct: true },
            { text: 'Продолжить выполнение', correct: false },
            { text: 'Завершить программу', correct: false }
          ]
        },
        {
          text: 'Какие управляющие конструкции существуют в PHP?',
          type: 'multiple',
          answers: [
            { text: 'if-else', correct: true },
            { text: 'switch', correct: true },
            { text: 'for, while, foreach', correct: true },
            { text: 'All of the above', correct: true }
          ]
        }
      ]
    },
    // Модуль 3: Функции
    {
      moduleId: 3,
      questions: [
        {
          text: 'Какое ключевое слово используется для объявления функции?',
          type: 'single',
          answers: [
            { text: 'func', correct: false },
            { text: 'function', correct: true },
            { text: 'def', correct: false },
            { text: 'procedure', correct: false }
          ]
        },
        {
          text: 'Как вернуть значение из функции?',
          type: 'single',
          answers: [
            { text: 'break', correct: false },
            { text: 'exit', correct: false },
            { text: 'return', correct: true },
            { text: 'yield', correct: false }
          ]
        },
        {
          text: 'Что такое анонимная функция?',
          type: 'single',
          answers: [
            { text: 'Функция без имени', correct: true },
            { text: 'Приватная функция', correct: false },
            { text: 'Статическая функция', correct: false },
            { text: 'Функция в классе', correct: false }
          ]
        },
        {
          text: 'Какие виды функций существуют в PHP?',
          type: 'multiple',
          answers: [
            { text: 'Обычные функции', correct: true },
            { text: 'Анонимные функции', correct: true },
            { text: 'Стрелочные функции', correct: true },
            { text: 'Все перечисленные', correct: true }
          ]
        }
      ]
    },
    // Модуль 4: Массивы
    {
      moduleId: 4,
      questions: [
        {
          text: 'Как создать индексированный массив?',
          type: 'single',
          answers: [
            { text: '$arr = array(1, 2, 3);', correct: true },
            { text: '$arr = {1, 2, 3};', correct: false },
            { text: '$arr = [1, 2, 3];', correct: true },
            { text: 'Both A and C', correct: true }
          ]
        },
        {
          text: 'Как получить количество элементов в массиве?',
          type: 'single',
          answers: [
            { text: 'length($arr)', correct: false },
            { text: 'count($arr)', correct: true },
            { text: 'size($arr)', correct: false },
            { text: 'sizeof($arr)', correct: true }
          ]
        },
        {
          text: 'Какой тип массива использует строковые ключи?',
          type: 'single',
          answers: [
            { text: 'Индексированный', correct: false },
            { text: 'Ассоциативный', correct: true },
            { text: 'Многомерный', correct: false },
            { text: 'Динамический', correct: false }
          ]
        },
        {
          text: 'Какие функции для работы с массивами вы знаете?',
          type: 'multiple',
          answers: [
            { text: 'array_push', correct: true },
            { text: 'array_pop', correct: true },
            { text: 'array_merge', correct: true },
            { text: 'Все перечисленные', correct: true }
          ]
        }
      ]
    },
    // Модуль 5: Работа с формами
    {
      moduleId: 5,
      questions: [
        {
          text: 'Какой суперглобальный массив содержит данные формы отправленной методом POST?',
          type: 'single',
          answers: [
            { text: '$_GET', correct: false },
            { text: '$_POST', correct: true },
            { text: '$_REQUEST', correct: true },
            { text: '$_DATA', correct: false }
          ]
        },
        {
          text: 'Как начать сессию в PHP?',
          type: 'single',
          answers: [
            { text: 'session_begin()', correct: false },
            { text: 'session_start()', correct: true },
            { text: 'start_session()', correct: false },
            { text: 'init_session()', correct: false }
          ]
        },
        {
          text: 'Для чего используется функция htmlspecialchars()?',
          type: 'single',
          answers: [
            { text: 'Для шифрования', correct: false },
            { text: 'Для защиты от XSS', correct: true },
            { text: 'Для валидации', correct: false },
            { text: 'Для кодирования URL', correct: false }
          ]
        },
        {
          text: 'Какие суперглобальные массивы существуют в PHP?',
          type: 'multiple',
          answers: [
            { text: '$_GET, $_POST', correct: true },
            { text: '$_SESSION, $_COOKIE', correct: true },
            { text: '$_FILES, $_SERVER', correct: true },
            { text: 'Все перечисленные', correct: true }
          ]
        }
      ]
    },
    // Модуль 6: Работа с БД
    {
      moduleId: 6,
      questions: [
        {
          text: 'Что такое PDO?',
          type: 'single',
          answers: [
            { text: 'PHP Data Objects', correct: true },
            { text: 'PHP Database Operator', correct: false },
            { text: 'PHP Data Operator', correct: false },
            { text: 'PHP Database Objects', correct: false }
          ]
        },
        {
          text: 'Для чего используются подготовленные выражения?',
          type: 'single',
          answers: [
            { text: 'Для ускорения запросов', correct: false },
            { text: 'Для защиты от SQL инъекций', correct: true },
            { text: 'Для упрощения кода', correct: false },
            { text: 'Для логирования', correct: false }
          ]
        },
        {
          text: 'Какой метод используется для выполнения SELECT запроса?',
          type: 'single',
          answers: [
            { text: 'execute()', correct: false },
            { text: 'query()', correct: true },
            { text: 'select()', correct: false },
            { text: 'fetch()', correct: false }
          ]
        },
        {
          text: 'Какие операции с БД вы можете выполнять через PDO?',
          type: 'multiple',
          answers: [
            { text: 'SELECT', correct: true },
            { text: 'INSERT, UPDATE, DELETE', correct: true },
            { text: 'CREATE TABLE', correct: true },
            { text: 'Все перечисленные', correct: true }
          ]
        }
      ]
    },
    // Модуль 7: ООП
    {
      moduleId: 7,
      questions: [
        {
          text: 'Какое ключевое слово используется для создания класса?',
          type: 'single',
          answers: [
            { text: 'object', correct: false },
            { text: 'class', correct: true },
            { text: 'struct', correct: false },
            { text: 'type', correct: false }
          ]
        },
        {
          text: 'Как создать объект класса?',
          type: 'single',
          answers: [
            { text: 'new ClassName()', correct: true },
            { text: 'create ClassName()', correct: false },
            { text: 'ClassName.create()', correct: false },
            { text: 'object ClassName', correct: false }
          ]
        },
        {
          text: 'Что такое конструктор?',
          type: 'single',
          answers: [
            { text: 'Метод __construct', correct: true },
            { text: 'Метод __init', correct: false },
            { text: 'Метод __new', correct: false },
            { text: 'Метод __create', correct: false }
          ]
        },
        {
          text: 'Какие принципы ООП существуют?',
          type: 'multiple',
          answers: [
            { text: 'Инкапсуляция', correct: true },
            { text: 'Наследование', correct: true },
            { text: 'Полиморфизм', correct: true },
            { text: 'Все перечисленные', correct: true }
          ]
        }
      ]
    },
    // Модуль 8: Безопасность
    {
      moduleId: 8,
      questions: [
        {
          text: 'Что такое XSS?',
          type: 'single',
          answers: [
            { text: 'Cross-Site Scripting', correct: true },
            { text: 'XML Site Syntax', correct: false },
            { text: 'Cross-Server Security', correct: false },
            { text: 'Xenon Security System', correct: false }
          ]
        },
        {
          text: 'Как защититься от SQL инъекций?',
          type: 'single',
          answers: [
            { text: 'Использовать подготовленные выражения', correct: true },
            { text: 'Экранировать все данные', correct: true },
            { text: 'Валидировать входные данные', correct: true },
            { text: 'Все перечисленное', correct: true }
          ]
        },
        {
          text: 'Какая функция используется для хеширования паролей?',
          type: 'single',
          answers: [
            { text: 'md5()', correct: false },
            { text: 'sha1()', correct: false },
            { text: 'password_hash()', correct: true },
            { text: 'crypt()', correct: false }
          ]
        },
        {
          text: 'Какие виды угроз безопасности существуют?',
          type: 'multiple',
          answers: [
            { text: 'XSS', correct: true },
            { text: 'SQL Injection', correct: true },
            { text: 'CSRF', correct: true },
            { text: 'Все перечисленные', correct: true }
          ]
        }
      ]
    }
  ];

  questionsData.forEach(moduleQuestions => {
    moduleQuestions.questions.forEach(q => {
      const questionId = insertQuestion.run(moduleQuestions.moduleId, q.text, q.type, 0).lastInsertRowid;
      q.answers.forEach(answer => {
        insertAnswer.run(questionId, answer.text, answer.correct ? 1 : 0);
      });
    });
  });

  console.log('Вопросы для тестов добавлены');

  // Добавление вопросов для итогового теста
  const finalQuestions = [
    {
      text: 'Какой символ используется для объявления переменной в PHP?',
      type: 'single',
      answers: [
        { text: '@', correct: false },
        { text: '$', correct: true },
        { text: '#', correct: false },
        { text: '&', correct: false }
      ]
    },
    {
      text: 'Какой метод отправки формы более безопасен для передачи конфиденциальных данных?',
      type: 'single',
      answers: [
        { text: 'GET', correct: false },
        { text: 'POST', correct: true },
        { text: 'REQUEST', correct: false },
        { text: 'Одинаково', correct: false }
      ]
    },
    {
      text: 'Что выведет следующий код: echo 2 + "2"; ?',
      type: 'single',
      answers: [
        { text: '22', correct: false },
        { text: '4', correct: true },
        { text: 'Ошибка', correct: false },
        { text: 'null', correct: false }
      ]
    },
    {
      text: 'Какая функция используется для подключения файла?',
      type: 'single',
      answers: [
        { text: 'import()', correct: false },
        { text: 'require()', correct: true },
        { text: 'include()', correct: true },
        { text: 'Both B and C', correct: true }
      ]
    },
    {
      text: 'Что такое сессия в PHP?',
      type: 'single',
      answers: [
        { text: 'Время выполнения скрипта', correct: false },
        { text: 'Механизм хранения данных на стороне сервера', correct: true },
        { text: 'База данных', correct: false },
        { text: 'Куки браузера', correct: false }
      ]
    },
    {
      text: 'Какие магические методы существуют в PHP?',
      type: 'multiple',
      answers: [
        { text: '__construct', correct: true },
        { text: '__destruct', correct: true },
        { text: '__call', correct: true },
        { text: 'Все перечисленные', correct: true }
      ]
    },
    {
      text: 'Для чего используется оператор === ?',
      type: 'single',
      answers: [
        { text: 'Присваивание', correct: false },
        { text: 'Сравнение только значений', correct: false },
        { text: 'Сравнение значений и типов', correct: true },
        { text: 'Логическое И', correct: false }
      ]
    },
    {
      text: 'Какой способ аутентификации является наиболее безопасным?',
      type: 'single',
      answers: [
        { text: 'Хранение паролей в открытом виде', correct: false },
        { text: 'MD5 хеширование', correct: false },
        { text: 'password_hash() с PASSWORD_DEFAULT', correct: true },
        { text: 'base64 кодирование', correct: false }
      ]
    },
    {
      text: 'Что делает функция array_map()?',
      type: 'single',
      answers: [
        { text: 'Создает карту массива', correct: false },
        { text: 'Применяет функцию к каждому элементу массива', correct: true },
        { text: 'Объединяет массивы', correct: false },
        { text: 'Сортирует массив', correct: false }
      ]
    },
    {
      text: 'Какие принципы безопасной разработки вы знаете?',
      type: 'multiple',
      answers: [
        { text: 'Валидация всех входных данных', correct: true },
        { text: 'Использование подготовленных выражений', correct: true },
        { text: 'Хеширование паролей', correct: true },
        { text: 'Все перечисленные', correct: true }
      ]
    }
  ];

  finalQuestions.forEach(q => {
    const questionId = insertQuestion.run(null, q.text, q.type, 1).lastInsertRowid;
    q.answers.forEach(answer => {
      insertAnswer.run(questionId, answer.text, answer.correct ? 1 : 0);
    });
  });

  console.log('Вопросы для итогового теста добавлены');
}

console.log('База данных успешно инициализирована');

module.exports = db;
