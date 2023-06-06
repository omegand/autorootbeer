module.exports = function consume(mod) {
    const fs = require('fs');
    const path = require('path');
    let { settings, skills } = require('./config');
    let enabled = settings.enabled;
    let command = mod.command || mod.require.command;
    let gameId = null;
    let job = null;
    let onCooldown = false;
    let debugMode = false;

    command.add('autoroot', (arg) => {
        switch (arg) {
            case 'reload':
                delete require.cache[require.resolve('./config')];
                ({ settings, skills } = require('./config'));
                command.message('Reloaded settings.');
                break;
            case 'skillinfo':
                debugMode = !debugMode;
                command.message('Skill info display is : ' + (debugMode ? 'Enabled.' : 'Disabled.'));
                break;
            case 'help':
                const readmePath = path.join(__dirname, 'README.md');
                fs.readFile(readmePath, 'utf8', (err, data) => {
                    if (err) {
                        command.message('Wtf where did you put the readme');
                        console.log(err);
                    } else {
                        command.message(data);
                    }
                });
                break;
            default:
                enabled = !enabled;
                command.message('Alcoholism is ' + (enabled ? 'Enabled.' : 'Disabled.'));
                break;
        }
    });

    mod.hook('S_LOGIN', mod.majorPatchVersion >= 86 ? 14 : 13, (event) => {
        gameId = event.gameId;
        job = (event.templateId - 10101) % 100;
    });

    mod.hook('C_START_SKILL', 7, { order: -10 }, (event) => {
        if (!enabled) return;

        const skillInfo = getSkillInfo(event.skill.id);

        if (debugMode) {
            command.message('Skill info: group: ' + skillInfo.group + ' / job: ' + job);
        }
        if (onCooldown) return;

        for (let s = 0; s < skills.length; s++) {
            if (
                skills[s].group === skillInfo.group &&
                skills[s].job === job
            ) {
                if (skills[s].delay) {
                    setTimeout(useItem, skills[s].delay);
                } else {
                    useItem();
                }
                break;
            }
        }
    });

    function useItem() {
        const items = settings.rootBeerIDs.map((id) => ({ gameId, id }));

        items.forEach((item) => {
            mod.toServer('C_USE_ITEM', 3, item);
        });

        onCooldown = true;
        setTimeout(() => {
            onCooldown = false;
        }, settings.rootBeerCD);
    }

    function getSkillInfo(id) {
        let nid = id; // -= 0x4000000
        return {
            id: nid,
            group: Math.floor(nid / 10000),
            level: Math.floor((nid / 100) % 100),
            sub: nid % 100,
        };
    }
};
