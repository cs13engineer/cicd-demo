import express from 'express'
import path from 'path'
import data from './data/index.js'
const app = express()
const PORT = process.env.PORT ?? "8090"

app.get(`/`, (req, res)=>{
	console.log("The workflow is running");
	// res.send("Welocome to CI/CD app")
	//sending html template as a response

	res.sendFile(path.join(__dirname, 'templates', 'index.html'))
})

app.get(`/:name`,(req, res)=>{
	const name = req.params.name;
	console.log(`The name '${name}' was received in current request.`);
	res.send({status:true, msg: `The name recieved in current request was : ${name}`});
})

// fetch user data
app.get('/users',(req, res)=>{
	console.log("searching user data repo")
	if (data.length === 0){
		return res.send({status:false, msg:"No user data found."})
	}

	return res.send({
		status: true,
		msg: "data fetched successfully",
		data
	})
})

app.listen(PORT,()=>{ console.log(`App is running on ${PORT}`)})
