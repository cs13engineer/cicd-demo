import express from 'express'

const app = express()

const PORT = process.env.PORT ?? "8090"

app.get(`/`, (req, res)=>{
	res.send("Welocome to CI/CD app")
})

app.listen(PORT,()=>{ console.log(`App is running on ${PORT}`)})
