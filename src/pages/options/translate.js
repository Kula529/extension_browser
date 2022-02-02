import googleTranslateHelper from "../../assets/javascripts/helpers/google-translate.js";

let disableSimplyTranslateElement = document.getElementById("disable-simplyTranslate");

googleTranslateHelper.init().then(() => {
    disableSimplyTranslateElement.checked = !googleTranslateHelper.getDisableSimplyTranslate();
});

disableSimplyTranslateElement.addEventListener("change",
    (event) => googleTranslateHelper.setDisableSimplyTranslate(!event.target.checked)
);