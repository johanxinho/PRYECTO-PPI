import { useI18n } from "../i18n";

function Footer() {
    const { t } = useI18n();
    return (
        <footer className="site-footer">
            <p><span translate="no">PPI Conecta</span> <span>•</span> {t("public.footer.tagline")}</p>
            <p className="footer-year">2026</p>
        </footer>
    );
}
export default Footer;
