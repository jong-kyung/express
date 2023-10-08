const express = require('express'); // 아까 설치한 라이브러리를 첨부해달라는 의미(node js 로 서버 개발하기 위해 필요한 라이브러리)
const app = express(); // 라이브러리를 이용해서 새로운 객체를 만들어주세요라는 의미
app.use(express.urlencoded({ extended: true })) // body-parser 라이브러리 불러오기 (post요청을 쉽게하기 위해 설치)

const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs') // html 에 DB를 꽂아 넣는 라이브러리
// <%= 서버에서 보낸 데이터의 변수명 %> : 서버에 데이터 삽입
// <% 자바스크립트 문법 %> : 자바스크립트 문법 적용

const methodOverride = require('method-override');
app.use(methodOverride('_method')) // method-override 설치(put 요청을 하기 위해 설치)

const http = require('http').createServer(app); // socket.io 셋팅
const { Server } = require("socket.io");
const io = new Server(http);

require('dotenv').config() // dotenv 등록

app.use('/public', express.static('public'))

// app.listen(8080, function () {
//     console.log('listening on 8080')
// });

MongoClient.connect(process.env.DB_URL, function (에러, client) { //연결되면 할일
    if (에러) return console.log(에러)

    db = client.db('todoapp');

    // db.collection('post').insertOne({ 이름: 'John', 나이: 20, _id: 100 }, function (에러, 결과) {
    //     console.log('저장완료')
    // });

    http.listen(process.env.PORT, function () { // socket.io 사용시 http.listen , 평상시엔 app.listen
        console.log('listening on 8080')
    });
    // 파라미터1 : 서버띄울 포트번호, 파라미터2 : 띄운 후 실행할 코드
})

app.get('/socket', (요청, 응답) => {
    응답.render('socket.ejs')
})

io.on('connection', function (socket) { // 웹소켓 접속시 실행하는 코드
    // console.log('접속완료');

    socket.on('joinroom', function (data) {
        socket.join('room1');
    })

    socket.on('room1-send', function (data) {
        io.to('room1').emit('broadcast', data)
    })

    socket.on('user-send', function (data) { // 서버가 수신
        // console.log(data)
        // io.to(socket.id).emit('broadcast', data) // 특정 id 끼리만 소통
        io.emit('broadcast', data)
    })
})

// 위 세줄 : 서버를 띄우기 위한 기본 셋팅   

// 누군가가 /pet으로 방문을 하면 pet 관련된 안내문을 띄워주자
app.get('/pet', function (요청, 응답) {//요청 : req, 응답 :res
    응답.send('펫용품 쇼핑할 수 있는 페이지입니다.');
}) // 파라미터1: 경로

// 누군가가 /beauty로 접속하면 '뷰티용품 사세요'라는 안내문 출력
app.get('/beauty', function (요청, 응답) {
    응답.send('뷰티용품 사세요')
})

app.get('/', function (요청, 응답) {// / 하나만 쓰면 홈임
    응답.render('index.ejs')
})

app.get('/write', function (요청, 응답) { // sendFile() : 파일을 전송
    응답.render('write.ejs') // __dirname : 현재 파일의 경로
})

app.get('/list', function (요청, 응답) {
    // 디비에 저장된 post라는 collection안의 모든 데이터를 꺼내주세요
    db.collection('post').find().toArray(function (에러, 결과) { // 모든 자료 추출하기
        // console.log(결과)
        응답.render('list.ejs', { posts: 결과 });
    });
})

app.get('/detail/:id', function (요청, 응답) { // :id = url 파라미터
    db.collection('post').findOne({ _id: parseInt(요청.params.id) }, function (에러, 결과) {
        응답.render('detail.ejs', { data: 결과 });
    })
})

app.get('/edit/:id', function (요청, 응답) {
    db.collection('post').findOne({ _id: parseInt(요청.params.id) }, function (에러, 결과) {
        응답.render('edit.ejs', { post: 결과 })
    })
})

app.put('/edit', function (요청, 응답) {
    db.collection('post').updateOne({ _id: parseInt(요청.body.id) }, { $set: { 제목: 요청.body.title, 날짜: 요청.body.date } }, function (에러, 결과) {
        console.log('수정완료')
        응답.redirect('/list')
    })
})

const passport = require('passport'); // passport 설치
const LocalStrategy = require('passport-local').Strategy; // passport-local 설치
const session = require('express-session'); // express-session 설치

app.use(session({ secret: '비밀코드', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());


app.get('/login', function (요청, 응답) {
    응답.render('login.ejs')
})
app.post('/login', passport.authenticate('local', {
    failureRedirect: '/fail'
}), function (요청, 응답) {
    응답.redirect('/')
});

passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
}, function (입력한아이디, 입력한비번, done) {
    //console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: 입력한아이디 }, function (에러, 결과) {
        if (에러) return done(에러)

        if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
        if (입력한비번 == 결과.pw) {
            return done(null, 결과)
        } else {
            return done(null, false, { message: '비번틀렸어요' })
        }
    })
}));

app.get('/mypage', checkLogin, function (요청, 응답) {
    // console.log(요청.user)
    응답.render('mypage.ejs', { 사용자: 요청.user })
});

function checkLogin(요청, 응답, next) {
    if (요청.user) { // 로그인 후 세션이 있으면 요청.user가 항상있음 
        next()
    } else {
        응답.send('로그인 해주세요')
    }
}

passport.serializeUser(function (user, done) {
    done(null, user.id)
}); // id를 이용해서 세션을 저장시키는 코드

passport.deserializeUser(function (아이디, done) { // user.id === 아이디
    db.collection('login').findOne({ id: 아이디 }, function (에러, 결과) {
        done(null, 결과)
    })
}) // 이 세션데이터를 가진 사람을 DB에서 찾아주는 코드

app.post('/register', function (요청, 응답) {
    db.collection('login').insertOne({ id: 요청.body.id, pw: 요청.body.pw }, function (에러, 결과) {
        응답.redirect('/')
    })
})

// 어떤 사람이 /add 경로로 POST요청을 하면 ??를 해주세요.
app.post('/add', function (요청, 응답) {
    // 요청.user._id // 현재 로그인한 사람의 정보 들어있음

    응답.send('전송완료');
    db.collection('counter').findOne({ name: '게시물갯수' }, function (에러, 결과) { // 자료하나 뽑아오기
        console.log(결과.totalPost)
        var 총게시물갯수 = 결과.totalPost

        var 저장할거 = { _id: 총게시물갯수 + 1, 작성자: 요청.user._id, 제목: 요청.body.title, 날짜: 요청.body.date }

        db.collection('post').insertOne(저장할거, (에러, 결과) => {
            console.log('저장완료');
            db.collection('counter').updateOne({ name: '게시물갯수' }, { $inc: { totalPost: 1 } }, function (에러, 결과) {
                if (에러) return console.log(에러)
            })
        })
    })
})

app.delete('/delete', function (요청, 응답) {
    // console.log(요청.body);
    요청.body._id = parseInt(요청.body._id);

    var 삭제할데이터 = { _id: 요청.body._id, 작성자: 요청.user._id }
    db.collection('post').deleteOne(삭제할데이터, function (에러, 결과) {
        console.log('삭제완료')
        if (에러) console.log(에러)
        응답.status(200).send({ message: '성공했습니다' });
    })
})

// app.get('/search', function (요청, 응답) {
//     // console.log(요청.query) // query string 꺼내는법 
//     db.collection('post').find({ $text: { $search: 요청.query.value } }).toArray((에러, 결과) => {
//         // console.log(결과)
//         응답.render('search.ejs', { posts: 결과 })
//     })
// })

/* text index 생성시 장점
1. 빠른 검색 
2. or 검색가능 
3. - 제외가능
4. "정확히 일치하는 것만"
*/

app.get('/search', function (요청, 응답) {
    var 검색조건 = [
        {
            $search: {
                index: 'titleSearch',
                text: {
                    query: 요청.query.value,
                    path: '제목'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
                }
            }
        },
        // { $project: { 제목: 1, _id: 0, score: { $meta: 'searchScore' } } }, // 검색결과에서 필터주기, 내가 원하는것만 보여주고싶을때 사용 / 1로 표기하면 데이터에서 가져옴, 0으로 표기하면 안가져옴
        // { $sort: { _id: 1 } }, // 결과 정렬하기 1 or -1 
        // { $limit: 10 } // 갯수 제한주기
    ]
    db.collection('post').aggregate(검색조건).toArray((에러, 결과) => {
        // console.log(결과)
        응답.render('search.ejs', { posts: 결과 })
    })
})

app.use('/shop', require('./routes/shop')) // app.use() 고객이 / 경로로 요청할때 이 라우터를 적용해달라는 의미

app.use('/board/sub', require('./routes/board'))

// multer 셋팅법
let multer = require('multer');
var storage = multer.diskStorage({

    destination: function (req, file, cb) { // 이미지업로드한걸 경로설정하는방법
        cb(null, './public/image')
    },
    filename: function (req, file, cb) { // 파일명 설정하는방법
        cb(null, file.originalname) // 기존파일명으로 저장하겠다는 의미
    }
    // filefilter: function (req, file, cb) { // 파일 형식 거르기

    // }
});

var upload = multer({ storage: storage });

app.get('/upload', (요청, 응답) => {
    응답.render('upload.ejs')
})

app.post('/upload', upload.single('profile'), (요청, 응답) => {
    응답.send('업로드완료')
})

app.get('/image/:imageName', (요청, 응답) => {
    응답.sendFile(__dirname + '/public/image/' + 요청.params.imageName)
})

const { ObjectId } = require('mongodb') // ObjectId 함수 사용

app.post('/chatroom', checkLogin, function (요청, 응답) {
    var 저장할거 = {
        title: '무슨무슨채팅방',
        member: [ObjectId(요청.body.당한사람id), 요청.user._id],
        date: new Date()
    }

    db.collection('chatroom').insertOne(저장할거), function (에러, 결과) {
        응답.send('데이터저장완료')
    };
});

app.get('/chat', checkLogin, (요청, 응답) => {
    db.collection('chatroom').find({ member: 요청.user._id }).toArray((에러, 결과) => {
        응답.render('chat.ejs', { chats: 결과 })
    })
})

app.post('/message', checkLogin, function (요청, 응답) {
    var 저장할거 = {
        parent: 요청.body.parent,
        userid: 요청.user._id,
        content: 요청.body.content,
        date: new Date(),
    }
    db.collection('message').insertOne(저장할거)
        .then((결과) => {
            응답.send(결과);
        })
});


app.get('/message/:parentid', checkLogin, function (요청, 응답) {

    응답.writeHead(200, {
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
    });

    db.collection('message').find({ parent: 요청.params.parentid }).toArray()
        .then((결과) => {
            // console.log(결과);
            응답.write('event: test\n');
            응답.write(`data: ${JSON.stringify(결과)}\n\n`);
        });


    const pipeline = [
        { $match: { 'fullDocument.parent': 요청.params.parentid } } // 원하는 document만 감시하고싶으면
    ];
    const collection = db.collection('message');
    const changeStram = collection.watch(pipeline);
    changeStram.on('change', (result) => {
        // console.log(result.fullDocument) // 수정된 데이터 확인방법
        응답.write('event: test\n');
        응답.write(`data: ${JSON.stringify([result.fullDocument])}\n\n`);
    })
});