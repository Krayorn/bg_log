import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function NewGame() {
    const [errors, setErrors] = useState([])
    const navigate = useNavigate();

    const addGame = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const formJson = Object.fromEntries(formData.entries());
        
        if (formJson.price === "") {
            delete formJson.price
        }

        const response = await fetch('http://localhost/games', { method: "POST", body: JSON.stringify(formJson)})
        
        const data = await response.json()
        if (response.status === 400) {
            setErrors(data.errors)
        } else {
            navigate('/games/' + data.id)
        }
    }

  return (
    <main className="">
        <form method="post" onSubmit={addGame} className='flex flex-col justify-around m-4 items-center'>
            <h1 className="text-xl font-semibold" >New Game</h1>      
            <label className="mt-8 flex flex-col" >
                <span className="text-center" >Name:</span> 
                <input className="text-ambiance bg-highlight text-center rounded-3xl p-2" name="name" type="text"></input>
            </label>
            <label className="mt-8 flex flex-col" >
                <span className="text-center" >Price:</span> 
                <input className="text-ambiance bg-highlight text-center rounded-3xl p-2" name="price" type="number"></input>
            </label>
            {
                errors.length > 0 &&
                <div className="mt-4" >
                    {
                        errors.map(err => (<span key={err} >{err}</span>))
                    }
                </div>
            }

            <button className="mt-8 border rounded p-2 bg-highlight text-ambiance hover:bg-inter transition-colors" >Add the game</button>
        </form>
    </main>
  )
}