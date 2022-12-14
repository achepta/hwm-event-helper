import {$, get, set} from "./utils/commonUtils";

export function addFilteringArea() {
    document.querySelector(".Global").insertAdjacentHTML("afterend",
        getFilteringAreaTemplate())
    setBlockedWavesListener()
    setAllowedWavesListener()
    setBlockedHeroesListener()
    setAllowedHeroesListener()
    setBlockedLeadershipListener()

    function setBlockedWavesListener() {
        $('blocked-waves-list').addEventListener('input', (event) => {
            set("blocked_waves_1", event.target.value.split(",").filter(item => item !== ""))
        })
    }

    function setAllowedWavesListener() {
        $('allowed-waves-list').addEventListener('input', (event) => {
            set("allowed_waves_1", event.target.value.split(",").filter(item => item !== ""))
        })
    }

    function setBlockedHeroesListener() {
        $('blocked-heroes-list').addEventListener('input', (event) => {
            set("blocked_heroes_1", event.target.value.split(",").filter(item => item !== ""))
        })
    }

    function setAllowedHeroesListener() {
        $('allowed-heroes-list').addEventListener('input', (event) => {
            set("allowed_heroes_1", event.target.value.split(",").filter(item => item !== ""))
        })
    }

    function setBlockedLeadershipListener() {
        $('blocked-leadership').addEventListener('input', (event) => {
            set("blocked_leadership", event.target.value)
        })
    }

    function getFilteringAreaTemplate() {
        return `
                <style>
                    .filters-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    .filtering-item {}
                    .filtering-item textarea {
                        min-width: 400px;
                        resize: none;
                        overflow-x: visible;
                        border-radius: 5px;
                    }
                    .filtering-item:nth-child(n+1) {
                        margin-top: 10px;
                    }
                </style>
                <br/>
                <div class="filters-container">
                    <div><b>?????????????? (?????????????????????? ??????????????????????????):</b></div>
                    <div class="filtering-item">
                        <textarea id="blocked-waves-list" placeholder="???????????????????? ?????????? ?????????? ??????????????">${get("blocked_waves_1", []).join(",")}</textarea>
                    </div>
                    <div class="filtering-item">
                        <textarea id="allowed-waves-list" placeholder="???????????????? ?????????? ?????????? ??????????????">${get("allowed_waves_1", []).join(",")}</textarea>
                    </div>
                    <div class="filtering-item">
                        <textarea id="blocked-heroes-list" placeholder="???????????????????? ???????????????? ?????????? ??????????????">${get("blocked_heroes_1", []).join(",")}</textarea>
                    </div>
                    <div class="filtering-item">
                        <textarea id="allowed-heroes-list" placeholder="???????????????? ???????????????? ?????????? ??????????????">${get("allowed_heroes_1", []).join(",")}</textarea>
                    </div>
                    <div class="filtering-item">
                        <textarea id="blocked-leadership" placeholder="???????????? ?????????? ???? ??????????????????">${get("blocked_leadership", "")}</textarea>
                    </div>
                </div>
                <br/>`
    }
}

export function processFilters() {
    if (document.querySelector(".Global > div.TextBlock.TextBlockMIDDLE > div > div > table > tbody")) {
        let trs = Array.from(document.querySelector(".Global > div.TextBlock.TextBlockMIDDLE > div > div > table > tbody").childNodes)
        processBlockedWaves(trs)
        processBlockedHeroes(trs)
        processBlockedLeadership(trs)
    }

    function processBlockedWaves(trs) {
        let blockedWaves = get("blocked_waves_1", []).filter(item => item !== "")
        let allowedWaves = get("allowed_waves_1", []).filter(item => item !== "")
        trs.forEach(tr => {
            let waveId = tr.textContent.match(/(????\.: |Lv\.: )(\d{1,3})/)[2]
            if (blockedWaves.includes(waveId - 0) || allowedWaves.length > 0 && !allowedWaves.includes(waveId - 0)) {
                try {
                    tr.remove()
                } catch (e) {}
            }
        })
    }

    function processBlockedHeroes(trs) {
        let blockedHeroes = get("blocked_heroes_1", []).filter(item => item !== "")
        let allowedHeroes = get("allowed_heroes_1", []).filter(item => item !== "")
        trs.forEach(tr => {
            let heroName = tr.textContent.match(/([??-????-??????a-zA-Z0-9_* ()-]+) \[\d{1,2}]/)[1]
            if (blockedHeroes.includes(heroName) || allowedHeroes.length > 0 && !allowedHeroes.includes(heroName)) {
                try {
                    tr.remove()
                } catch (e) {}
            }
        })
    }

    function processBlockedLeadership(trs) {
        let blockedLeadership = get("blocked_leadership", "0")
        trs.forEach(tr => {
            let leadership = tr.textContent.match(/\d{1,2},\d{3}/)[0].replaceAll(",", "")
            if (blockedLeadership - 0 > leadership - 0) {
                try {
                    tr.remove()
                } catch (e) {}
            }
        })
    }
}