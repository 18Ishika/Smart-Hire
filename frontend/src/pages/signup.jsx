import { useState } from "react";
import { signupUser } from "../api/auth";

function Signup() {

const [username,setUsername] = useState("")
const [email,setEmail] = useState("")
const [password,setPassword] = useState("")

const handleSignup = async (e)=>{
e.preventDefault()

try{

const res = await signupUser({
username,
email,
password
})

console.log(res.data)
alert("Signup successful")

}catch(err){
console.log(err.response.data)
alert("Signup failed")
}

}

return(

<div>

<h2>Signup</h2>

<form onSubmit={handleSignup}>

<input
placeholder="Username"
onChange={(e)=>setUsername(e.target.value)}
/>

<input
placeholder="Email"
onChange={(e)=>setEmail(e.target.value)}
/>

<input
type="password"
placeholder="Password"
onChange={(e)=>setPassword(e.target.value)}
/>

<button type="submit">Signup</button>

</form>

</div>

)

}

export default Signup