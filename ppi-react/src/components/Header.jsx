/**
 * Header (legado): cabecera de una landing anterior.
 * La cabecera actual de RECORDATE está en App.jsx (Landing). No se monta desde App.jsx.
 */
function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand-mark" aria-hidden="true">R</div>
        <div>
          <p className="eyebrow">Agenda académica</p>
          <h1>RECORDATE</h1>
        </div>
        <div className="header-note">Tu próximo paso empieza aquí <span aria-hidden="true">↗</span></div>
      </div>
    </header>
  );
}

export default Header;
