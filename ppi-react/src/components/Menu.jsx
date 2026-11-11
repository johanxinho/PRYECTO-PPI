import { useI18n } from "../i18n";

function Menu() {
    const { t } = useI18n();
    return (
        <nav className="site-nav" aria-label={t("public.navigation.ariaLabel")}>
            <div className="nav-inner">
                <p className="nav-label">{t("public.navigation.explore")}</p>
                <div className="nav-links">
                    <a className="nav-link active" href="#inicio">{t("public.navigation.home")}</a>
                    <a className="nav-link" href="#autenticacion">{t("public.navigation.account")} <span aria-hidden="true">↗</span></a>
                </div>
            </div>
        </nav>
    );
}
export default Menu;
