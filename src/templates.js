import {cdnHost, heroCreatures} from "./utils/commonUtils";

export function getSpoiler(type, index, spoilerHead, spoilerBody) {
    return `
            <div>
                <input type="checkbox" id="spoiler_${type}_${index}"/>
                <label for="spoiler_${type}_${index}">
                    ${spoilerHead}
                </label>
                <div class="spoiler">
                    ${spoilerBody}
                </div>
            </div>
        `
}

export function getNewCreatureIcon(creaturePortrait, newAmount) {
    return `
        <div class="cre_creature custom-creature">
            <img src="https://${cdnHost}/i/army_html/fon_lvl${heroCreatures[creaturePortrait] ? heroCreatures[creaturePortrait].rarity : "1"}.png?v=1" width="50" height="50" class="cre_mon_image2" alt="">
            <img src="https://${cdnHost}/i/portraits/${creaturePortrait}p33.png" height="50" alt="" class="cre_mon_image1">
            <div class="cre_amount custom-amount" id="add_now_count">${newAmount}</div>
        </div>`
}