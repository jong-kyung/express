var router = require('express').Router(); // express 라이브러리를 사용하겠다는 선언

function checkLogin(요청, 응답, next) {
    if (요청.user) { // 로그인 후 세션이 있으면 요청.user가 항상있음 
        next()
    } else {
        응답.send('로그인 해주세요')
    }
}

router.use(checkLogin); // router에 전부 적용하는 미들웨어 생성

router.get('/shirts', function (요청, 응답) {
    응답.send('셔츠 파는 페이지입니다.')
})

router.get('/pants', function (요청, 응답) {
    응답.send('바지 파는 페이지입니다.')
})

module.exports = router; // export 문법과 동일함