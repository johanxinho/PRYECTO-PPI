import { useI18n } from "../i18n";
function Registro(){
  const { t } = useI18n();
  return (
    <div className="container">
      <h2>{t("auth.signup.title")}</h2>
      <input className="form-control mb-2" placeholder={t("auth.form.name")} />
      <input className="form-control mb-2" placeholder={t("auth.form.email")} />
      <button className="btn btn-success">{t("auth.signup.register")}</button>
    </div>
  );
}
export default Registro;
