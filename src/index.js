import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import data from '../data/index.js'

const app = express()
const PORT = process.env.PORT ?? "8090"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const users = data

app.use(express.json())

const sanitizeUser = (user) => {
	const { password, ...safeUser } = user
	return {
		...safeUser,
		hobies: Array.isArray(user.hobies) ? [...user.hobies] : []
	}
}

const sendUsers = (res) => {
	res.send({
		status: true,
		msg: "data fetched successfully",
		data: users.map(sanitizeUser)
	})
}

app.get(`/`, (req, res)=>{
	console.log("The workflow is running");
	res.sendFile(path.join(__dirname, '../templates', 'index.html'))
})

// fetch user data
app.get('/users',(req, res)=>{
	console.log("searching user data repo")
	return sendUsers(res)
})

app.post('/users', (req, res)=>{
	const { username, password, name, designation, hobbies } = req.body || {}

	if (!username || !password || !name || !designation) {
		return res.status(400).send({
			status: false,
			msg: 'username, password, name, and designation are required.'
		})
	}

	const normalizedUsername = String(username).trim()
	const existingUser = users.find((user) => user.username.toLowerCase() === normalizedUsername.toLowerCase())

	if (existingUser) {
		return res.status(409).send({
			status: false,
			msg: 'A user with this username already exists.'
		})
	}

	const newUser = {
		username: normalizedUsername,
		password: String(password),
		name: String(name).trim(),
		designation: String(designation).trim(),
		hobies: Array.isArray(hobbies) ? hobbies.map((item) => String(item).trim()).filter(Boolean) : []
	}

	users.push(newUser)

	return res.status(201).send({
		status: true,
		msg: 'User added successfully.',
		data: sanitizeUser(newUser)
	})
})

app.delete('/users/:username', (req, res)=>{
	const username = String(req.params.username || '').trim()
	const userIndex = users.findIndex((user) => user.username.toLowerCase() === username.toLowerCase())

	if (userIndex === -1) {
		return res.status(404).send({
			status: false,
			msg: 'User not found.'
		})
	}

	const [removedUser] = users.splice(userIndex, 1)

	return res.send({
		status: true,
		msg: 'User removed successfully.',
		data: sanitizeUser(removedUser)
	})
})

app.get('/user-details', (req, res)=>{
	res.sendFile(path.join(__dirname, '../templates', 'user-details.html'))
})

app.get(`/:name`,(req, res)=>{
	const name = req.params.name;
	console.log(`The name '${name}' was received in current request.`);
	res.send({status:true, msg: `The name recieved in current request was : ${name}`});
})

app.listen(PORT,()=>{ 
	try{
		console.log(`App is running on ${PORT} my server is up and running!`)
	}catch(error){
		console.log("Error: ", error)
	}
})
