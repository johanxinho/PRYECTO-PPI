function Header() {
    return (
        <header className="site-header">
            <div className="header-inner">
                <div className="brand-mark" aria-hidden="true">P</div>
                <div>
                    <p className="eyebrow">Plataforma de perfiles</p>
                    <h1>PPI <span>Conecta</span></h1>
                </div>
                <div className="header-note">Tu próximo paso empieza aquí <span aria-hidden="true">↗</span></div>
            </div>
        </header>
    );
}

export default Header;