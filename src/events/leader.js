import {$, allFactions, cdnHost, findAll, get, heroCreatures, set} from "../utils/commonUtils";
import {eventHelperSettings, setSettings} from "../settings";
import {collapseEventDesc, getCurrentLevel} from "../utils/eventUtils";
import {setLeaderboard} from "../leaderboard";
import {doGet, doHWMGet, doHWMPost} from "../utils/networkUtils";
import {getNewCreatureIcon} from "../templates";

export default function leaderEvent() {
    let lg_lvl = parseInt(get('hero_leader_lvl', 10));
    let battles = [];
    let isLostBattles = false;

    unsafeWindow.sendApplyArmy = sendApplyArmy
    unsafeWindow.showSpecialCreatureData = showSpecialCreatureData
    unsafeWindow.replaceCellListener = replaceCellListener
    unsafeWindow.removeOverlay = removeOverlay

    if (/(leader_rogues|leader_winter)/.test(location.href)) {
        if (document.body.innerHTML.includes("leader_rogues.php?action=cancel_merc")) {
            addFilteringArea()
            processFilters()
            return
        }
        if (location.href.includes("?show_2x2_form=1") || location.href.includes("?show_merc_dialog=1")) {
            return
        }

        eventHelperSettings(document.querySelector('.Global'), (container) => {
            setSettings("auto_send_event_lg", "Отправлять бои из ГЛ ивента в сервис автоматически", container)
            setSettings("only_clan_visibility", "Мои бои доступны только для клана", container, false)
            setSettings("collapse_event_desc", "Всегда сворачивать описания боев", container, false)
            setSettings("lg_show_available", "Отображать только доступные наборы", container, false)
            setSettings("lg_hide_duplicates", "Скрывать дубликаты наборов", container, false)
        }, "afterend")
        collapseEventDesc()
        setLeaderboard(document.querySelector('[style="min-width:220px;"]').getElementsByTagName("center")[1])
        setLoading(Array.from(document.querySelectorAll('[align="left"][valign="top"]')).slice(-1)[0])
        getResources(getWaveInfo, createLeaderTemplate, Array.from(document.querySelectorAll('[align="left"][valign="top"]')).slice(-1)[0])
    }

    function createLeaderTemplate() {
        return `
                    <div class="wrapper">
                        <div class="records-container-body" id="main-data"></div>
                    </div>
                `
    }

    if (location.href.includes("leader_guild")) {
        //createWelcomeTemplate()
        lg_lvl = document.body.innerHTML.match(/lev=(\d{1,2})/)[1] - 0
        set("hero_leader_lvl", lg_lvl)
        eventHelperSettings(Array.from(document.querySelectorAll('table[class="wb"]')).slice(-1)[0], (container) => {
            setSettings("auto_send_lg", "Отправлять бои с опасными бандитами в сервис автоматически", container)
            setSettings("only_clan_visibility", "Мои бои доступны только для клана", container, false)
            setSettings("lg_show_available", "Отображать только доступные наборы", container, false)
            setSettings("lg_hide_duplicates", "Скрывать дубликаты наборов", container, false)
        }, "afterend")
        if (!document.body.innerText.includes("Опасная цель устранена")) {
            setLoading(Array.from(document.querySelectorAll(`td[valign="top"][align="left"]`)).slice(-1)[0])
            getResources(getTodayBandits, createBanditsTemplate, Array.from(document.querySelectorAll(`td[valign="top"][align="left"]`)).slice(-1)[0])
        }
    }

    function createBanditsTemplate() {
        return `
                    <div class="wrapper">
                        <div class="records-container-body" id="main-data"></div>
                    </div>
                `
    }

    async function getResources(getExamples, showExamples, target) {
        await Promise.all([getHeroCreatures(), getExamples()]).then(() => {
            setExampleBattles(showExamples(), target)
        })
    }

    function setLoading(where = document.body) {
        where.insertAdjacentHTML("beforeend", `
                    <div style="display: flex; justify-content: center;"  id="loading" >
                        <img style="margin-top: 20px" src="https://i.imgur.com/4RrPm82.gif" width="400" alt="">
                    </div>`)
    }

    function getHeroCreatures() {
        return new Promise(((resolve) => {
            doHWMGet('/leader_army.php', doc => {
                processLeaderArmyResponse(doc)
                resolve()
            })
        }))
    }

    function processLeaderArmyResponse(doc) {
        let bodyHTML = doc
            .body
            .innerHTML
            .toString()

        let matchesId = findAll(/obj\[\d{1,3}]\['monster_id'] = '([a-z0-9_-]+)'/g, bodyHTML)
        let matchesCount = findAll(/obj\[\d{1,3}]\['count'] = (\d+)/g, bodyHTML)
        let matchesCost = findAll(/obj\[\d{1,3}]\['cost'] = (\d+)/g, bodyHTML)
        let matchesName = findAll(/obj\[\d{1,3}]\['name'] = '([А-Яа-яёЁa-zA-Z`_ -]+)'/g, bodyHTML)
        let matchesPortrait = findAll(/obj\[\d{1,3}]\['lname'] = '([a-z0-9_-]+)'/g, bodyHTML)
        let matchesVersion = findAll(/obj\[\d{1,3}]\['version'] = '(\d{1,3})'/g, bodyHTML)
        let matchesRarity = findAll(/obj\[\d{1,3}]\['rarity'] = (\d{1,3})/g, bodyHTML)
        let matchesRace = findAll(/obj\[\d{1,3}]\['race'] = (\d{1,3})/g, bodyHTML)

        matchesPortrait.forEach((id, index) => {
            heroCreatures[id[1]] = {
                'count': matchesCount[index][1],
                'cost': matchesCost[index][1],
                'name': matchesName[index][1],
                'id': matchesId[index][1],
                'version': matchesVersion[index][1],
                'rarity': matchesRarity[index][1],
                'race': matchesRace[index][1],
            }
        })
    }

    function getWaveInfo() {
        return new Promise(((resolve) => {
            doGet(`getEventLeaderBattles?wave=${getCurrentLevel()}&token=${get("hwm_events_token", "")}`, doc => {
                battles = doc
                if (battles.length > 0) {
                    battles.sort((a, b) => {
                        a = parseFloat(a.cost)
                        b = parseFloat(b.cost)
                        if (a < 0 || b < 0) {
                            return b - a
                        } else {
                            return a - b
                        }
                    })
                    resolve()
                } else {
                    doGet(`getEventLeaderFailedBattles?wave=${getCurrentLevel()}&token=${get("hwm_events_token", "")}`, doc => {
                        battles = doc
                        isLostBattles = true
                        resolve()
                    }, false)
                }
            }, false)
        }))
    }

    function getTodayBandits() {
        return new Promise(((resolve) => {
            doGet(`getDbBattles?lg_lvl=${lg_lvl}&token=${get("hwm_events_token", "")}`, doc => {
                battles = doc
                battles.sort((a, b) => parseFloat(b.survived) - parseFloat(a.survived))
                resolve()
            }, false)
        }))
    }

    function setExampleBattles(template, where = document.body) {
        $('loading').remove()
        where.insertAdjacentHTML("beforeend",  template);
        if (!isLostBattles) {
            processRecords(battles)
        } else {
            processFailedRecords(battles)
        }
    }

    function processFailedRecords(failedEventBattles) {
        let allRecords = failedEventBattles.reduce((prev, curr, index) => {
            return prev + `
                                <div style="display: flex; justify-content: space-between; padding: 1px;">
                                    <div>${index + 1}. </div>
                                    <div style="text-align: center">${getRecordPlayersTemplate(curr.nicknames)}</div>
                                    <div> <a target="_blank" href="/warlog.php?warid=${curr["battle_id"]}&show_for_all=${curr["battle_secret"]}&lt=-1">Бой</a></div>
                                </div>`
        }, "")

        let result = `<div class="failed-records-wrapper">
                                <div class="failed-records-container">
                                    <div style="text-align: center;">
                                        <h3>Примеры поражений</h3>
                                    </div>
                                    ${allRecords}
                                </div>
                            </div>`
        $('main-data').insertAdjacentHTML("beforeend", result)
    }

    let processedBattleCreatures = []
    let rowDatas = {}

    function processRecords(records) {
        console.log(heroCreatures)
        let allRecords = records.reduce((prev, curr, index) => {
            return prev + addRecord(curr, index)
        }, "")
        $('main-data').insertAdjacentHTML("beforeend", allRecords)
    }

    function addRecord(record, index) {
        let playersCreaturesInfo = []
        record.creatures.forEach((playerCreatures, playerId) => {
            let rowData = []
            Object
                .entries(playerCreatures)
                .forEach(([creaturePortrait, creatureAmount]) => {
                    processRecordHeroCreatures(rowData, creatureAmount, creaturePortrait)
                })
            playersCreaturesInfo.push(rowData)
            rowDatas[`${index}:${playerId}`] = rowData
        })
        let isAllCreaturesAvailable = isAllPresent(playersCreaturesInfo[0])
        let recordLeadership = getLeadership(playersCreaturesInfo[0])
        if (!get("lg_show_available", false) || isAllCreaturesAvailable && recordLeadership > (lg_lvl + 9) * 1000 && recordLeadership <= (lg_lvl + 10) * 1000) {
            let recordCreatureIds = Object.keys(record.creatures[0])
            recordCreatureIds.sort((a, b) => a.localeCompare(b))
            if (!get("lg_hide_duplicates", false) || !processedBattleCreatures.includes(recordCreatureIds.join(":"))) {
                let playersCreatures = record.creatures.map((playerCreatures, playerId) => {
                    let playerCreaturesHTML = ""
                    let rowData = []
                    Object
                        .entries(playerCreatures)
                        .forEach(([creaturePortrait, creatureAmount], cellId) => {
                            processRecordHeroCreatures(rowData, creatureAmount, creaturePortrait)
                            playerCreaturesHTML += `<div id="creature-${index}-${playerId}-${cellId}">${getNewCreatureIcon(creaturePortrait, creatureAmount)}</div>`
                        })
                    return `
                        <div class="record-player-creatures" id="creatures-${index}-${playerId}">
                            <div id="creatures-${index}-${playerId}-apply" class="creatures-apply">
                                <div id="creatures-${index}-${playerId}-apply-button" class="home_button2 btn_hover2" onclick="sendApplyArmy('${index}:${playerId}')">Набрать</div>
                                <div id="creatures-${index}-${playerId}-leadership" class="player-leadership">
                                    ${getRecordPlayerLeadershipTemplate(index, playerId, getLeadership(rowData), isAllCreaturesAvailable)}
                                </div>
                            </div>
                            <div id="creatures-${index}-${playerId}-creatures" class="player-creatures-row">${playerCreaturesHTML}</div>
                        </div>`
                }).join(`<img src="https://i.imgur.com/Y3sbLcM.png" alt="" class="record-players-arms">`)
                //onwheel="if(this.scrollWidth > this.clientWidth){ if (event.deltaY > 0) {this.scrollLeft += 100;} else {this.scrollLeft -= 100;}; event.preventDefault()}"
                let recordContainer = `
                    <div class="record-wrapper" id="record-${index}">
                        <div class="record-container">
                            <div class="record-number"><div>${index + 1}</div></div>
                            <div class="record-players" id="record-${index}-players">
                                <div>${getRecordPlayersTemplate(record.nicknames)}</div>
                                <div>${getRecordResultTemplate(record)}</div>
                            </div>
                            <div class="record-players-creatures" id="record-${index}-creatures">${playersCreatures}</div>
                            ${record.special_creature ? getSpecialCreatureTemplate(record.special_creature, index) : ""}
                        </div>
                        <div class="special-creature-extended" id="special-creature-extended-${index}">
                            ${record.special_creature ? getSpecialCreatureExtraData(record.special_creature) : ""}
                        </div>
                    </div>`
                processedBattleCreatures.push(recordCreatureIds.join(":"))
                return recordContainer
            }
        }
        return ""
    }

    function processRecordHeroCreatures(rowData, creatureAmount, creaturePortrait) {
        if (heroCreatures.hasOwnProperty(creaturePortrait)) {
            if (creatureAmount - 0 <= heroCreatures[creaturePortrait]['count'] - 0) {
                rowData.push([creaturePortrait, creatureAmount, true])
            } else {
                rowData.push([creaturePortrait, creatureAmount, false])
            }
        } else {
            rowData.push([creaturePortrait, creatureAmount, false])
        }
    }

    function getSpecialCreatureTemplate(creatureData, index) {
        return `
                <div class="special-creature">
                    <div class="special-creature-info">
                        ${getNewCreatureIcon(creatureData.portrait, "")}
                        <div class="special-creature-info-button" onclick="showSpecialCreatureData('${index}')">
                            <img src="https://${cdnHost}/i/combat/btn_info.png" alt="creature info" height="50">
                        </div>
                    </div>
                    <div class="special-creature-stats">
                        <div>
                            <div>
                                <div><img class="special-creature-stat-icon" src="https://${cdnHost}/i/icons/attr_attack.png?v=1" alt="attack"></div>
                                <div class="special-creature-stat-value">${creatureData.attack.toFixed()}</div>
                            </div>
                            <div>
                                <div><img class="special-creature-stat-icon" src="https://${cdnHost}/i/icons/attr_speed.png?v=1" alt="attack"></div>
                                <div class="special-creature-stat-value">${creatureData.speed.toFixed()}</div>
                            </div>
                            <div>
                                <div><img class="special-creature-stat-icon" src="https://${cdnHost}/i/icons/attr_initiative.png?v=1" alt="attack"></div>
                                <div class="special-creature-stat-value">${creatureData.maxinit}</div>
                            </div>
                            <div>
                                <div><img class="special-creature-stat-icon" src="https://${cdnHost}/i/icons/attr_hit_points.png?v=1" alt="attack"></div>
                                <div class="special-creature-stat-value">${creatureData.health.toFixed()}</div>
                            </div>
                        </div>
                        <div>
                            <div>
                                <div><img class="special-creature-stat-icon" src="https://${cdnHost}/i/icons/attr_defense.png?v=1" alt="attack"></div>
                                <div class="special-creature-stat-value">${creatureData.defence.toFixed()}</div>
                            </div>
                            <div>
                                <div><img class="special-creature-stat-icon" src="https://${cdnHost}/i/icons/attr_shoots.png?v=1" alt="attack"></div>
                                <div class="special-creature-stat-value">${creatureData.shots.toFixed()}</div>
                            </div>
                            <div>
                                <div><img class="special-creature-stat-icon" src="https://${cdnHost}/i/icons/attr_damage.png?v=1" alt="attack"></div>
                                <div class="special-creature-stat-value">${creatureData.mindam.toFixed()}-${creatureData.maxdam.toFixed()}</div>
                            </div>
                        </div>
                    </div>
                </div>
                `
    }

    function showSpecialCreatureData(index) {
        $(`special-creature-extended-${index}`).classList.toggle("visible")
    }

    function getSpecialCreatureExtraData(creatureData) {
        return `
                <b>Навыки</b>: ${creatureData.skills.map(skill => skill.replace(". ", "").replace(".", "")).join(", ")}.<br>
                <b>Заклинания</b>: ${creatureData.casts.map((cast, index) => {
                    if (creatureData.casts_effects) {
                        return `${cast} (${creatureData.casts_effects[index]})`
                    }
                    return cast
                }).join(", ")}.
                        `
    }

    function isAllPresent(rowData) {
        let isAllPresent = true;
        rowData.forEach(cre => {
            if (!cre[2]) {
                isAllPresent = false
            }
        })
        return isAllPresent
    }

    function getRecordPlayersTemplate(nicknames) {
        return nicknames.map(nickname => `<a href="/search.php?key=${nickname}">${nickname}</a>`).join("<br>+<br>")
    }

    function getRecordResultTemplate(record) {
        return `
            <div class="record-result">
                <div><img src="https://${cdnHost}/i/r/48/gold.png?v=3.23de65" title="Потрачено на воскрешение" alt="gold"><span> ${record.cost}</span></div>
                <div><a href="/war.php?lt=-1&warid=${record.battle_id}&show_for_all=${record.battle_secret}" target="_blank">Бой</a></div>
                ${record.survived === undefined ? "" : `<div>${record.survived}%</div>`}
            </div>`
    }


    function replaceCellListener(rowDataId, recordId, playerId, cellId) {
        let rowData = rowDatas[rowDataId]
        setSelectNewCreatureTemplate(rowData, recordId, playerId, cellId)
    }

    function setSelectNewCreatureTemplate(rowData, recordId, playerId, cellId) {
        let replaceCreatureTarget = $(`replace-creature-${recordId}-${playerId}-${cellId}`).parentElement
        let newCreatureTemplate = `
               <div style="position: absolute; width: 100%; height: ${getScrollHeight() + 500}px; background: rgba(0,0,0,0.22); z-index: 1000000" onclick="removeOverlay()">
                   <div id="select-new-creature" style="position: absolute; background: #608FBF; border: 3px solid cyan;  width: 300px; height: 400px; z-index: 4; display: flex; flex-direction: column" onclick="event.stopPropagation()">
                        <div id="select-new-creature-faction" style="display: flex; flex-direction: row; flex-wrap: wrap"></div>
                        <div id="new-creatures" style="overflow-y: auto; display: flex; flex-direction: column"></div>
                    </div>
               </div>`
        let android = $(`android_container`)
        let container = android ? android : document.body
        container.insertAdjacentHTML('afterbegin', newCreatureTemplate)
        let newCreatureElement = $(`select-new-creature`)
        newCreatureElement.style.left = replaceCreatureTarget.offsetLeft + 60
        newCreatureElement.style.top = replaceCreatureTarget.offsetTop
        fillNewCreatures(-1, rowData, recordId, playerId, cellId)
        allFactions.forEach(faction => {
            $(`select-new-creature-faction`).insertAdjacentHTML('beforeend', getHTMLFactionSelect(faction))
            $(`faction-select${faction[0]}`).addEventListener('click', () => {
                $(`new-creatures`).innerHTML = ''
                fillNewCreatures(faction[0], rowData, recordId, playerId, cellId)
            })
        })
    }

    function fillNewCreatures(constraint, rowData, recordId, playerId, cellId) {
        let remainingLeadership = getRemainingLeadership(rowData, cellId)
        Object
            .entries(heroCreatures)
            .forEach(([key, value], index) => {
                if (!checkExistingInRowData(key, rowData) && (constraint === -1 ? true : value['race'] - 0 === constraint)) {
                    let newAmount = Math.min(Math.floor(Math.min(remainingLeadership, (10 + lg_lvl) * 400) / (value['cost'] - 0)), value['count'] - 0)
                    if (newAmount > 0) {
                        $('new-creatures').insertAdjacentHTML('beforeend', `
                                <div id="new-creature-${index}" style="display: flex; flex-direction: row;">
                                    ${getNewCreatureIcon(key, newAmount)}
                                    <div style="margin: auto">
                                        <p style="text-decoration: underline; cursor: pointer">${value['name']}</p>
                                    </div>
                                </div>`)
                        $(`new-creature-${index}`).addEventListener('click', () => {
                            let replaceTarget = $(`creature-${recordId}-${playerId}-${cellId}`)
                            replaceTarget.innerHTML = getNewCreatureIcon(key, newAmount)
                            rowData[cellId] = [key, newAmount, true]
                            setLeaderShip(recordId, playerId, rowData)
                            removeOverlay()
                        })
                    }
                }
            })
    }

    function getHTMLFactionSelect(faction) {
        let factionSelectBody
        if (faction[0] === -1) {
            factionSelectBody = `<b>All</b>`
        } else {
            factionSelectBody = `<img src="https://${cdnHost}/i/f/${faction[2]}" alt="${faction[1]}" title="${faction[1]}" style="width: 30px; height: 30px">`
        }
        return `
            <div id="faction-select${faction[0]}" style="justify-content: center; display: flex; align-items: center; width: 50px; height: 50px; cursor: pointer">
                ${factionSelectBody}
            </div>
            `
    }

    function checkExistingInRowData(name, rowData) {
        let isExist = false
        rowData.forEach(cre => {
            if (name === cre[0]) {
                isExist = true
            }
        })
        return isExist
    }

    function setLeaderShip(recordId, playerId, rowData) {
        let allPresent = isAllPresent(rowData)
        $(`creatures-${recordId}-${playerId}-apply-button`).innerText = "Набрать"
        $(`creatures-${recordId}-${playerId}-leadership`).innerHTML =
            getRecordPlayerLeadershipTemplate(recordId, playerId, getLeadership(rowData), allPresent)
    }

    function getRecordPlayerLeadershipTemplate(recordId, playerId, leadership, allPresent) {
        return `
                <img height="24" src="https://${cdnHost}/i/icons/attr_leadership.png?v=1" alt="" title="Лидерство сборки">
                <span id="leadership-number-${recordId}-${playerId}" style="color: ${allPresent ? "green" : "red"}">
                    ${leadership}
                </span>`
    }

    function getLeadership(rowData) {
        return rowData.filter(cre => cre[2]).reduce((leadership, cre) => {
            return leadership + (heroCreatures[cre[0]]['cost'] - 0) * (cre[1] - 0)
        }, 0)
    }

    function getRemainingLeadership(rowData, cellId) {
        return (10 + lg_lvl) * 1000
            - getLeadership(rowData)
            + (rowData[cellId][1] - 0)
            * (heroCreatures.hasOwnProperty(rowData[cellId][0]) && heroCreatures[rowData[cellId][0]]['count'] >= rowData[cellId][1] - 0
                ? heroCreatures[rowData[cellId][0]]['cost'] - 0
                : 0)
    }

    function sendApplyArmy(rowDataId) {
        doHWMPost(`/leader_army_apply.php`, getApplyArmyForm(rowDatas[rowDataId]), () => {
            location.reload()
        })
    }

    function getApplyArmyForm(rowData) {
        let formData = new FormData()
        formData.append('idx', "0")
        rowData.filter(cre => cre[2]).forEach((creData, index) => {
            formData.append(`countv${index + 1}`, creData[1])
            formData.append(`mon_id${index + 1}`, heroCreatures[creData[0]]['id'])
        })
        return formData
    }

    function removeOverlay() {
        $(`select-new-creature`).parentElement.remove()
    }
}