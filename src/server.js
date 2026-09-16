import app from './app.js'

const PORT = process.env.PORT ?? "8090"

app.listen(PORT,()=>{ 
	try{
		console.log(`App is running on ${PORT} my server is up and running!`)
	}catch(error){
		console.log("Error: ", error)
	}
})
