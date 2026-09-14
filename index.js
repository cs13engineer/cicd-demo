import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import data from './data/index.js'

const app = express()
const PORT = process.env.PORT ?? "8090"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.get(`/`, (req, res)=>{
	console.log("The workflow is running");
	res.sendFile(path.join(__dirname, 'templates', 'index.html'))
})

// fetch user data
app.get('/users',(req, res)=>{
	console.log("searching user data repo")
	if (data.length === 0){
		return res.send({status:false, msg:"No user data found."})
	}

	data.forEach((items)=>{
		delete items.password; // removing password field from the  repsonse 
		
	})

	return res.send({
		status: true,
		msg: "data fetched successfully",
		data
	})
})

app.get('/user-details', (req, res)=>{
	res.sendFile(path.join(__dirname, 'templates', 'user-details.html'))
})

app.get(`/:name`,(req, res)=>{
	const name = req.params.name;
	console.log(`The name '${name}' was received in current request.`);
	res.send({status:true, msg: `The name recieved in current request was : ${name}`});
})

app.listen(PORT,()=>{ console.log(`App is running on ${PORT}`)})
