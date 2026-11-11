import { useI18n } from "../i18n";

// Renderiza la sección informativa de la comunidad PPI Conecta.
function AcercaDe() {
    const { t } = useI18n();
    const usuarios = [
        { inicial: "01", nombre: t("public.about.featureOneTitle"), descripcion: t("public.about.featureOneDescription") },
        { inicial: "02", nombre: t("public.about.featureTwoTitle"), descripcion: t("public.about.featureTwoDescription") },
    ];
    return (
        <main className="about-section" aria-labelledby="about-title">
            <div className="about-intro">
                <p className="eyebrow accent-label">{t("public.about.eyebrow")}</p>
                <h2 id="about-title">{t("public.about.headingLineOne")}<br /><em>{t("public.about.headingLineTwo")}</em></h2>
                <p className="intro-copy">{t("public.about.intro")}</p>
            </div>
            <div className="feature-list">
                {usuarios.map((usuario) => (
                    <article className="feature-card" key={usuario.inicial}>
                        <span className="feature-number">{usuario.inicial}</span>
                        <div>
                            <h3>{usuario.nombre}</h3>
                            <p>{usuario.descripcion}</p>
                        </div>
                        <span className="feature-arrow" aria-hidden="true">↗</span>
                    </article>
                ))}
            </div>
        </main>
    );
}
export default AcercaDe;
