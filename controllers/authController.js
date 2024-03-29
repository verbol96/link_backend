const {User, Token} = require('../models/models')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

class authController {


    async registration(req, res, next){
        try {
            const {phone, password} = req.body
            const candidat = await User.findAll({where:{phone: phone}})
            if(candidat.length>0) return res.json('такой существует')
            const hashPassword = await bcryptjs.hash(password, 3)
            const user = await User.create({phone, password: hashPassword})
            const accessToken = jwt.sign({ "id": user.id, "phone": user.phone}, process.env.ACCESS_KEY, {expiresIn: '1h'})
            const refreshToken = jwt.sign({ "id": user.id, "phone": user.phone}, process.env.REFRESH_KEY, {expiresIn: '72h'})
            const token = await Token.findOne({where:{userId: user.id}})
            if(token){
                await Token.update({token: refreshToken}, {where:{id: token.id}})
            }else{
                await Token.create({refreshToken, userId: user.id})
            }
            res.cookie('refreshToken', refreshToken, {maxAge: 30*24*60*60*1000, httpOnly: true})
            
            return res.json({user, accessToken, refreshToken} )
        } catch (error) {
            console.log(error)
        }
        
    }

    async login(req, res, next){
        try {
            const {phone, password} = req.body
            const user = await User.findOne({where:{phone: phone}})
            if(!user) return res.json('не верный телефон')
            const isPassword = await bcryptjs.compare(password, user.password)
            if(!isPassword) return res.json('не верный пароль')


            const accessToken = jwt.sign({ "id": user.id, "phone": user.phone}, process.env.ACCESS_KEY, {expiresIn: '1h'})
            const refreshToken = jwt.sign({ "id": user.id, "phone": user.phone}, process.env.REFRESH_KEY, {expiresIn: '72h'})
            

            await Token.destroy({where: {userId: user.id}})
            await Token.create({refreshToken, userId: user.id})

            res.cookie('refreshToken', refreshToken, {maxAge: 30*24*60*60*1000, httpOnly: true})
            
            return res.json({user, accessToken} )
        } catch (error) {
            console.log(error)
        }
        
    }
    
    async refresh(req, res, next){
        try {
            
            const token = req.cookies.refreshToken
            
            const data = jwt.verify(token, process.env.REFRESH_KEY)
            const tokenDB = await Token.findOne({where: {refreshToken: token}})
            
            if(!data || ! tokenDB){
                return res.json('error refresh')
            }

            const user = await User.findOne({where: {id: tokenDB.userId}})

            const accessToken = jwt.sign({ "id": user.id, "phone": user.phone}, process.env.ACCESS_KEY, {expiresIn: '1h'})
            const refreshToken = jwt.sign({ "id": user.id, "phone": user.phone}, process.env.REFRESH_KEY, {expiresIn: '72h'})
            
            await Token.update({refreshToken}, {where:{id: tokenDB.id}})
            res.cookie('refreshToken', refreshToken, {maxAge: 30*24*60*60*1000, httpOnly: true})
            return res.json({user, accessToken, refreshToken})
        } catch (error) {
            console.log(error)
        }
        
    }
    async logout(req, res, next){
        try {
            const {refreshToken} = req.cookies
            const token = await Token.destroy({where: {refreshToken: refreshToken}})
            res.clearCookie('refreshToken')
            return res.json(token)
        } catch (error) {
            console.log(error)
        }
        
    }

    async getUsers(req,res){
        try {
            const users = await User.findAll()
            return res.json(users)
        } catch (error) {
            console.log(error)
        }
    }

    async passwordChange(req,res, next){
        try {
            const {oldPW, newPW} = req.body
            console.log({oldPW, newPW})
            const token = req.headers.authorization;
            const {phone} = jwt.verify(token.split(' ')[1], process.env.ACCESS_KEY)
            const user = await User.findOne({where:{phone:phone}})
           
            const isPassword = await bcryptjs.compare(oldPW, user.password)
            if(!isPassword) return res.json(0)

            const hashPassword = await bcryptjs.hash(newPW, 3)
            const data = await User.update({password: hashPassword}, {where: {id: user.id}})
          
            return res.json(data)
        } catch (error) {
            console.log(error)
        }
    }

    async dataChange(req,res, next){
        try {
            const {phone, name, nikname} = req.body
            const user = await User.findOne({where:{phone:phone}})

            const data = await User.update({ name: name, nikname: nikname }, {where: {id: user.id}})
          
            return res.json(data)
        } catch (error) {
            console.log(error)
        }
    }

    async whoAmI(req, res, next){
        try {
            const token = req.headers.authorization;
            const {phone} = jwt.verify(token.split(' ')[1], process.env.ACCESS_KEY)
            const user = await User.findOne({where: {phone: phone}})
            return res.json(user)
        } catch (error) {
            console.log(error)
        }
        
    }

    async addPW(req,res, next){ //это для добавления пароля, если NULL
        try {
            const {phone, password} = req.body

            const hashPassword = await bcryptjs.hash(password, 3)
            const data = await User.update({password: hashPassword}, {where: {phone: phone}})
          
            return res.json(data)
        } catch (error) {
            console.log(error)
        }
    }
}

module.exports = new authController()