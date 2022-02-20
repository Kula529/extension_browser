import wikipediaHelper from "../../../assets/javascripts/helpers/wikipedia.js";
import commonHelper from "../../../assets/javascripts/helpers/common.js";

let disableWikipediaElement = document.getElementById("disable-wikipedia");
disableWikipediaElement.addEventListener("change",
    (event) => wikipediaHelper.setDisable(!event.target.checked)
);
wikipediaHelper.init().then(() => {
    disableWikipediaElement.checked = !wikipediaHelper.getDisable();

    commonHelper.processDefaultCustomInstances(
        'wikiless',
        'normal',
        wikipediaHelper,
        document,
        wikipediaHelper.getWikilessNormalRedirectsChecks,
        wikipediaHelper.setWikilessNormalRedirectsChecks,
        wikipediaHelper.getWikilessNormalCustomRedirects,
        wikipediaHelper.setWikilessNormalCustomRedirects
    )
})