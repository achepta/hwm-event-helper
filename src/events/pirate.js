import {get, sortByKey} from "../utils/commonUtils";
import {setLeaderboard} from "../leaderboard";
import {eventHelperSettings, setSettings} from "../settings";
import {doGet} from "../utils/networkUtils";

export default function pirateEvent() {
    if (location.href.includes("pirate_event.")) {
        let trs = document.querySelectorAll("#tableDiv")[2].querySelector("table > tbody").childNodes;
        let items = [];
        for (let i = 1; i < trs.length; i++) {
            let item_info = {};
            item_info.name = trs[i].querySelector("td:nth-child(1) > img").src;
            item_info.weight = trs[i].querySelector("td:nth-child(2)").innerText - 0;
            item_info.buy_price = trs[i].querySelector("td:nth-child(3) table > tbody > tr > td:nth-child(2)").innerText.replace(/,/g, "") - 0;
            item_info.sell_price = trs[i].querySelector("td:nth-child(4) table > tbody > tr > td:nth-child(2)").innerText.replace(/,/g, "") - 0;
            item_info.buy_form = trs[i].querySelector("td:nth-child(5)").innerHTML;
            item_info.opt_price = (item_info.sell_price - item_info.buy_price) / item_info.weight;
            if (item_info.buy_form.toString().length > 100) {
                items.push(item_info)
            }
        }
        items = sortByKey(items, "opt_price").reverse();
        let template = getPirateEventTemplate(items);
        let target_td = document.querySelectorAll("#tableDiv")[2];
        target_td.removeChild(target_td.childNodes[0]);
        target_td.insertAdjacentHTML("beforeend", template);
    }

    function getPirateEventTemplate(items) {
        let final_str = `
                <style>
                    .items-container {
                        display: flex;
                        flex-direction: column;
                    }
                    .items-row {
                        display: flex;
                    }
                    .item-itself {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .item-itself:nth-child(1) {
                        width: 15%;
                    }
                    .item-itself:nth-child(2) {
                        width: 20%;
                    }
                    .item-itself:nth-child(3) {
                        width: 11%;
                    }
                    .item-itself:nth-child(4) {
                        width: 27%;
                    }
                    .item-itself:nth-child(5) {
                        width: 27%;
                    }
    
                </style>
                <div class="items-container">
                    <div class="items-row">
                        <div class="item-itself">??????????</div>
                        <div class="item-itself">??????????????</div>
                        <div class="item-itself">??????</div>
                        <div class="item-itself">????????</div>
                        <div class="item-itself">????????????</div>
                    </div>`;
        items.forEach(item => {
            final_str += `
                    <div class="items-row">
                        <div class="item-itself"><img src="${item.name}" height="48" alt="icon"></div>
                        <div class="item-itself">${item.opt_price.toFixed(2)}</div>
                        <div class="item-itself">${item.weight}</div>
                        <div class="item-itself">${item.buy_price}->${item.sell_price}</div>
                        <div class="item-itself">${item.buy_form.toString().replaceAll("??????????????????", "????????????")}</div>
                    </div>`;
        })

        return final_str + `</div>`;
    }

    if (location.href.includes("pirate_self_event.")) {
        setLeaderboard(Array.from(document.querySelectorAll('table[width="100%"][align="left"]')).slice(-1)[0].previousElementSibling)
    }

    if (location.href.includes("pirate_land")) {
        document.querySelector("input[type=submit]").click()
    }

    if (location.href.includes("pirate_self_event_set")) {
        eventHelperSettings(document.querySelector(".pirate_self_top_block"), (container) => {
            setSettings("hide_solo_pirate_event_enemies", "???????????????????? ???????????????????? ??????", container, false)
        }, "beforeend")
        if (get("hide_solo_pirate_event_enemies", true)) {
            let newScript = document.createElement('script');
            newScript.setAttribute('src', 'https://cdn.jsdelivr.net/npm/apexcharts');
            document.head.appendChild(newScript);

            newScript.onload = () => {
                document.querySelector("#global_table_div2").style.overflow = "auto"
                document.querySelector("#global_table_div2").style.overflowX = "hidden"
                document.querySelector("#global_table_div2").style.maxHeight = "60vh"

                doGet(`getSoloPirateCreaturesPrices`, doc => {
                    Array.from(document.getElementsByClassName("pirate_self_table_padding")[1].getElementsByTagName("tr"))
                        .filter(elem => elem.innerHTML.includes("cre_creature"))
                        .forEach((elem, index) => {
                            let creatureName = elem.innerHTML.match(/name=([a-zA-Z0-9]+)/)[1]
                            let prices = doc[creatureName]
                            elem.insertAdjacentHTML("afterend", `
                                    <tr>
                                        <td colspan="3">
                                            <div style="height: 100px; overflow: hidden">
                                                <div id="chart${index}"></div>
                                            </div>
                                        </td>
                                    </tr>`)
                            let options = {
                                series: [{
                                    name: "Price",
                                    data: prices.map(price => price - 0)
                                }],
                                chart: {
                                    height: 128,
                                    width: 432,
                                    type: 'line',
                                    zoom: {
                                        enabled: false
                                    }
                                },
                                dataLabels: {
                                    enabled: false
                                },
                                stroke: {
                                    curve: 'straight',
                                    width: 2
                                },
                                grid: {
                                    row: {
                                        colors: ['#f3f3f3', 'transparent'], // takes an array which will be repeated on columns
                                        opacity: 0.5
                                    },
                                },
                                xaxis: {
                                    categories: Array.from(' '.repeat(prices.length)),
                                },
                                yaxis: [
                                    {
                                        labels: {
                                            formatter: function (val) {
                                                return val.toFixed(0);
                                            }
                                        }
                                    }
                                ]
                            };

                            let chart = new ApexCharts($(`chart${index}`), options);
                            chart.render();
                        })

                }, false)
            }
        }
    }
}