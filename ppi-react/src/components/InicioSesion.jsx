import { useI18n } from "../i18n";
function InicioSesion(){
  const { t } = useI18n();
  return (
    <div className="container">
      <h2>{t("auth.login.title")}</h2>
      <input className="form-control mb-2" placeholder={t("auth.form.email")} />
      <input className="form-control mb-2" placeholder={t("auth.form.password")} />
      <button className="btn btn-primary">{t("auth.login.submit")}</button>
    </div>
  );
}
export default InicioSesion;
