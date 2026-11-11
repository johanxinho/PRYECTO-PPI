import { useI18n } from "../i18n";

function Header() {
    const { t } = useI18n();
    return (
        <header className="site-header">
            <div className="header-inner">
                <div className="brand-mark" aria-hidden="true" translate="no">P</div>
                <div>
                    <p className="eyebrow">{t("public.header.eyebrow")}</p>
                    <h1><span translate="no">PPI Conecta</span></h1>
                </div>
                <div className="header-note">{t("public.header.note")} <span aria-hidden="true">↗</span></div>
            </div>
        </header>
    );
}
export default Header;
