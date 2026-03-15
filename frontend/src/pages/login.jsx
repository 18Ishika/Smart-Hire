import { useState } from "react";
import { loginUser } from "../api/auth";

function Login(){

const [username,setUsername] = useState("")
const [password,setPassword] = useState("")

const handleLogin = async (e)=>{

e.preventDefault()

try{

const res = await loginUser({
username,
password
})

console.log(res.data)

alert("Login successful")

}catch(err){

console.log(err.response.data)
alert("Invalid credentials")

}

}

return(

<div>

<h2>Login</h2>

<form onSubmit={handleLogin}>

<input
placeholder="Username"
onChange={(e)=>setUsername(e.target.value)}
/>

<input
type="password"
placeholder="Password"
onChange={(e)=>setPassword(e.target.value)}
/>

<button type="submit">Login</button>

</form>

</div>

)

}

export default Login