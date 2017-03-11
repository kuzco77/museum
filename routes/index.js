var express = require('express');
var router = express.Router();
var passport = require('passport');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var fs = require('fs');
var path = require('path');
var multer = require('multer');
var uploads = multer({dest: 'public/uploads/animal'});

var aclMiddleware = global.myCustomVars.aclMiddleware;
var acl = global.myCustomVars.acl;

router.use(function (req, res, next) {
	console.log(req.url);
	next();
})

router.get('/home', isLoggedIn, function (req, res) {
	res.render('home', {user: req.user, path: req.path});
})

router.get('/test', isLoggedIn, aclMiddleware('/test', 'view'), function (req, res, next) {
	
	acl.userRoles(req.session.userId, (err, roles) => {
		if (err){
			console.log(err);
			res.json({
				status: 'error'
			})
		}
		else {
			res.json({
				roles: roles
			})
		}
	})
	
})

router.get('/config', aclMiddleware('/config', 'view'), function (req, res, next) {
	User.find({}, function (err, users) {
		if (err){
			return console.log(err);
		}
		var aclRules = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/acl.json')).toString());
		var roles = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/roles.json')).toString());
		var cores = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/acl-core.json')).toString())
		var result = {};
		result.users = {};
		for (var i = 0; i < users.length; i++) {
			var user = {};
			user.id = users[i].id;
			user.fullname = users[i].fullname;
			user.username = users[i].username;
			user.lastLogin = users[i].lastLogin;
			// user.email = users[i].email;
			result.users[user.id] = user;
		}
		
		result.roles = [];
		for (var i in roles) {
			var r = {};
			r.role = roles[i].role;
			r.rolename = roles[i].rolename;
			result.roles.push(r);
		}
		result.aclRules = {};
		for (var i in aclRules) {
			result.aclRules[aclRules[i].userId] = [];
			for (var j = 0; j < aclRules[i].roles.length; j++) {
				result.aclRules[aclRules[i].userId].push(aclRules[i].roles[j]);
			}
		}
		// return res.json({
		// 	users: result.users,
		// 	roles: result.roles,
		// 	aclRules: result.aclRules,
		// 	user: req.user,
		// 	path: req.path
		// })
		res.render('config', {
			users: result.users,
			roles: result.roles,
			cores: cores,
			aclRules: result.aclRules,
			user: req.user,
			path: req.path
		});
	})
})

router.get('/config/roleTooltip', aclMiddleware('/config', 'view'), function (req, res, next) {
	var role = req.query.role;
	console.log(role);
	var roles = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/roles.json')).toString());
	return res.render('roleTooltip', {
		role: roles[role]
	});
})

router.post('/config', uploads.single('photo'), aclMiddleware('/config', 'create'), function (req, res, next){
	// Cập nhật role cho user
	console.log('---');
	console.log(req.body);
	// console.log(JSON.parse(req.body));
	console.log('---');
	User.findById(req.body.userid, function (err, user) {
		if (err){
			console.log(err);
			return res.status(403).json({
				status: 'error',
				error: 'You don\'t have permission to access this page'
			})
		}
		if (user){
			var roles = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/roles.json')).toString());
			var newRoles = [];
			for (var i in roles){
				var r = roles[i].role;
				if ((['admin', 'manager'].indexOf(r) < 0) && (r in req.body) && (req.body[r] == 'on')){
					// Không thể cấp phát quyền admin, manager tại route này ('/config')
					// Chỉ admin mới có thể cấp phát quyền admin, manager tại route '/admin/...'
					newRoles.push(r);
				}
			}
			var aclRules = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/acl.json')).toString());
			if (!(user.id in aclRules)){
				aclRules[user.id] = {};
				aclRules[user.id].userId = user.id;
				aclRules[user.id].roles = []
			}
			
			for(let nr of newRoles){
				// Phải giữ lại roles cũ, trong trường hợp tài khoản đã là Admin hoặc Manager.
				if (aclRules[user.id].roles.indexOf(nr) < 0){
					aclRules[user.id].roles.push(nr)
				}
			}
			fs.writeFileSync(path.join(__dirname, '../config/acl.json'), JSON.stringify(aclRules, null, 4));
			console.log("OK. restarting server");
			return restart(res);
		}
		else {
			return res.status(400).json({
				status: 'error',
				error: 'Invalid userid'
			})
		}
	})
})

router.post('/config/roles', uploads.single('photo'), aclMiddleware('/config', 'create'), function (req, res, next) {
	// Tạo role mới
	console.log(req.body);
	var rolename = req.body.rolename.trim();
	rolename = rolename.replace(/\r+\n+/g, ' ');
	rolename = rolename.replace(/ {2,}/g, ' ');
	var role = req.body.side + '_' + rolename;
	role = role.toLowerCase(); 
	role = role.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a"); 
	role = role.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e"); 
	role = role.replace(/ì|í|ị|ỉ|ĩ/g, "i"); 
	role = role.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o"); 
	role = role.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u"); 
	role = role.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y"); 
	role = role.replace(/đ/g, "d"); 
	role = role.replace(/ /g, "-");
	var aclRules = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/acl.json')).toString());
	var roles = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/roles.json')).toString());
	var cores = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/acl-core.json')))

	if (role in roles){
		return res.status(400).json({
			status: 'error',
			error: 'Trùng tên role'
		})
	}
	if (!cores.resources.hasOwnProperty(req.body.side)){
		return res.status(400).json({
			status: 'error',
			error: 'Mẫu được chọn không tồn tại'
		})
	}
	var r = {}
	r.role = role;
	r.rolename = rolename;
	r.allows = [
		{
			resource: '/app',
			actions: ['view']
		},
		{
			resource: cores.resources[req.body.side].url,
			resourceId: req.body.side,
			resourceName: cores.resources[req.body.side].resourceName,
			actions: []
		}
	];
	var actions = ['view', 'create', 'edit', 'delete'];
	for (var i = 0; i < actions.length; i++) {
		var act = actions[i];
		if ((act in req.body) && (req.body[act] == 'on')){
			r.allows[1].actions.push(act);
		}
	}
	if ((r.allows[1].actions.indexOf('edit') >= 0) && (r.allows[1].actions.indexOf('view') < 0)) {
		// If a role can edit, it can view, too.
		r.allows[1].actions.push('view');
	}

	roles[role] = r;
	// console.log(r);
	fs.writeFileSync(path.join(__dirname, '../config/roles.json'), JSON.stringify(roles, null, 4));

	return restart(res);
})

router.post('/config/roles/delete', uploads.single('photo'), aclMiddleware('/config', 'delete'), function (req, res, next) {
	var aclRules = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/acl.json')).toString());
	var roles = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/roles.json')).toString());
	var cores = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/acl-core.json')).toString());
	var role = req.body.deleteRole;
	console.log(role);
	if ((role == 'admin') || (role == 'manager')){
		return res.status(403).json({
			status: 'error',
			error: 'Không thể xóa cấp ' + role
		})
	}
	if (role in roles){
		delete roles[role];
		fs.writeFileSync(path.join(__dirname, '../config/roles.json'), JSON.stringify(roles, null, 4));
		for (var userId in aclRules){
			
			while (true){
				var index = aclRules[userId].roles.indexOf(role);
				if (index < 0){
					break;
				}
				aclRules[userId].roles.splice(index, 1);
			}
		}
		fs.writeFileSync(path.join(__dirname, '../config/acl.json'), JSON.stringify(aclRules, null, 4));
		return restart(res);
	}
	else {
		return res.status(400).json({
			status: 'error',
			error: 'Role không hợp lệ'
		})
	}
})

// router.get('/test', function (req, res, next) {
// 	res.end("hehe");
// })

/* GET home page. */
router.get('/', isLoggedIn, function(req, res, next) {
	res.redirect('/home');
});


function isLoggedIn (req, res, next) {
	if (!req.isAuthenticated()){
		return res.redirect('/auth/login');
	}
	return next();
}

var restart = global.myCustomVars.restart;

module.exports = router;
