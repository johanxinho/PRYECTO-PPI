function AcercaDe(){

const usuarios=[
{
nombre:"Usuario 1",
descripcion:"Descripción del usuario"
},
{
nombre:"Usuario 2",
descripcion:"Descripción del usuario"
}
]


return(
<div className="container mt-4">

<h2>Acerca de</h2>

<div className="row">

{
usuarios.map((u,index)=>(

<div className="col-md-4" key={index}>

<div className="card">

<div className="card-body">

<h5>{u.nombre}</h5>

<p>{u.descripcion}</p>

</div>

</div>

</div>

))

}

</div>

</div>
)

}

export default AcercaDe;