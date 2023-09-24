import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [errors, setErrors] = useState([])
    const navigate = useNavigate();

    const addGame = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const response = await fetch('http://localhost/api/login', { method: "POST",    headers: {
            "Content-Type": "application/json",
          }, body: JSON.stringify(Object.fromEntries(formData))})
        
        const data = await response.json()
        if (response.status === 400) {
            setErrors(data.errors)
        } else {
            navigate('/players/' + data.player.id)
        }
    }

  return (
    <main>
        <form method="post" onSubmit={addGame}>
            <label>
                <span>Username:</span> 
                <input name="name" type="text"></input>
            </label>
            <label>
                <span>Password:</span> 
                <input name="password" type="password"></input>
            </label>
            {
                errors.length > 0 &&
                <div className="mt-4" >
                    {
                        errors.map(err => (<span key={err} >{err}</span>))
                    }
                </div>
            }

            <button>Login</button>
        </form>
    </main>
  )
}