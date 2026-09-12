function Menu() {
    return (
        <nav className="site-nav" aria-label="Navegación principal">
            <div className="nav-inner">
                <p className="nav-label">Explora</p>
                <div className="nav-links">
                    <a className="nav-link active" href="#inicio">Inicio</a>
                    <a className="nav-link" href="#autenticacion">Mi cuenta <span aria-hidden="true">↗</span></a>
                </div>
            </div>
        </nav>
    );
}

export default Menu;