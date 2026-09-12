import express from 'express'

const app = express()

const PORT = process.env.PORT ?? "8090"

app.get(`/`, (req, res)=>{
	console.log("The workflow is running");
	res.send("Welocome to CI/CD app")
})

app.get(`/:name`,(req, res)=>{
	const name = req.params.name;
	console.log(`The name '${name}' was received in current request.`);
	res.send({status:true, msg: `The name recieved in current request was : ${name}`});
})

app.listen(PORT,()=>{ console.log(`App is running on ${PORT}`)})
