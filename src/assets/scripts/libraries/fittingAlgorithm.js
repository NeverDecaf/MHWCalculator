'use strict';
/**
 * Fitting Algorithm
 *
 * @package     MHW Calculator
 * @author      Scar Wu
 * @copyright   Copyright (c) Scar Wu (http://scar.tw)
 * @link        https://github.com/scarwu/MHWCalculator
 */

// Load Libraries
import MD5 from 'md5';

// Load Core
import Helper from 'core/helper';

// Load Custom Libraries
import ArmorDataset from 'libraries/dataset/armor';
import SetDataset from 'libraries/dataset/set';
import JewelDataset from 'libraries/dataset/jewel';
import CharmDataset from 'libraries/dataset/charm';
import CommonDataset from 'libraries/dataset/common';

// Load Constant
import Constant from 'constant';

class FittingAlgorithm {

    /**
     * Search
     */
    search = (requiredSets, requiredSkills, requiredEquips, algorithmParams) => {
        if (0 === requiredSets.length
            && 0 === requiredSkills.length
        ) {
            return [];
        }

        Helper.log('Input: Required Sets', requiredSets);
        Helper.log('Input: Required Skills', requiredSkills);
        Helper.log('Input: Required Equips', requiredEquips);
        Helper.log('Input: Algorithm Params', algorithmParams);

        this.algorithmParams = algorithmParams;
        this.conditionEquips = [];
        this.conditionSets = {};
        this.conditionSkills = {};
        this.correspondJewels = {};
        this.skipSkills = {};
        this.usedEquips = {};
        this.usedEquipTypes = {};
        this.conditionExpectedValue = 0;
        this.conditionExpectedLevel = 0;
        this.maxEquipsExpectedValue = {};
        this.maxEquipsExpectedLevel = {};

        let candidateEquips = {};
        let prevBundleList = {};
        let nextBundleList = {};
        let lastBundleList = {};
        let bundle = Helper.deepCopy(Constant.defaultBundle);

        // Create Info by Sets
        requiredSets.sort((setA, setB) => {
            let setInfoA = SetDataset.getInfo(setA.id);
            let setInfoB = SetDataset.getInfo(setB.id);

            if (Helper.isEmpty(setInfoA) || Helper.isEmpty(setInfoB)) {
                return 0;
            }

            return setInfoB.skills.pop().require - setInfoA.skills.pop().require;
        }).forEach((set) => {
            let setInfo = SetDataset.getInfo(set.id);

            if (Helper.isEmpty(setInfo)) {
                return;
            }

            this.conditionSets[set.id] = setInfo.skills[set.step - 1].require;
        });

        // Create Info by Skills
        requiredSkills.sort((skillA, skillB) => {
            return skillB.level - skillA.level;
        }).forEach((skill) => {
            if (0 === skill.level) {
                this.skipSkills[skill.id] = true;

                return;
            }

            this.conditionSkills[skill.id] = skill.level;

            let jewelInfo = JewelDataset.hasSkill(skill.id).getItems();
            let jewel = (0 !== jewelInfo.length) ? jewelInfo[0] : null;

            this.correspondJewels[skill.id] = (Helper.isNotEmpty(jewel)) ? {
                id: jewel.id,
                size: jewel.size,
            } : null;

            // Increase Expected Value & Level
            if (Helper.isNotEmpty(jewel)) {
                this.conditionExpectedValue += skill.level * jewel.size; // 1, 2, 3, 4
            } else {
                this.conditionExpectedValue += skill.level * 5;
            }

            this.conditionExpectedLevel += skill.level;
        });

        // Create First Bundle
        ['weapon', 'helm', 'chest', 'arm', 'waist', 'leg', 'charm'].forEach((equipType) => {
            if (Helper.isEmpty(requiredEquips[equipType])) {
                if ('weapon' !== equipType) {
                    this.conditionEquips.push(equipType);
                }

                return;
            }

            // Get Equip Info
            let equipInfo = null;

            if ('weapon' === equipType) {
                equipInfo = CommonDataset.getAppliedWeaponInfo(requiredEquips.weapon);
            } else if ('helm' === equipType
                || 'chest' === equipType
                || 'arm' === equipType
                || 'waist' === equipType
                || 'leg' === equipType
            ) {
                equipInfo = CommonDataset.getAppliedArmorInfo(requiredEquips[equipType]);
            } else if ('charm' === equipType) {
                equipInfo = CommonDataset.getAppliedCharmInfo(requiredEquips.charm);
            }

            // Check Equip Info
            if (Helper.isEmpty(equipInfo)) {
                return;
            }

            // Rewrite Equip Info Type
            equipInfo.type = equipType;

            // Convert Equip to Candidate Equip
            let candidateEquip = this.convertEquipToCandidateEquip(equipInfo, equipType);

            // Add Candidate Equip to Bundle
            bundle = this.addCandidateEquipToBundle(bundle, candidateEquip);

            // Add Jewels info to Bundle
            if (Helper.isNotEmpty(equipInfo.slots)) {
                equipInfo.slots.forEach((slot) => {
                    if (Helper.isEmpty(slot.jewel.id)) {
                        return;
                    }

                    if (Helper.isEmpty(bundle.jewels[slot.jewel.id])) {
                        bundle.jewels[slot.jewel.id] = 0;
                    }

                    bundle.jewels[slot.jewel.id] += 1;
                    bundle.meta.remainingSlotCount[slot.size] -= 1;
                    bundle.meta.remainingSlotCount.all -= 1;
                });
            }

            // Set Used Candidate Equip
            this.usedEquips[candidateEquip.id] = true;
        });

        Helper.log('Init: Condition Skills:', this.conditionSkills);
        Helper.log('Init: Condition Sets:', this.conditionSets);
        Helper.log('Init: Condition Equips:', this.conditionEquips);
        Helper.log('Init: Correspond Jewels:', this.correspondJewels);
        Helper.log('Init: Condition Expected Value:', this.conditionExpectedValue);
        Helper.log('Init: Condition Expected Level:', this.conditionExpectedLevel);

        // Reset Equip Count
        bundle.meta.equipCount = 0;

        prevBundleList[this.generateBundleHash(bundle)] = bundle;

        let requireEquipCount = this.conditionEquips.length;
        let requireSkillCount = Object.keys(this.conditionSkills).length;

        Helper.log('First: Bundle List:', prevBundleList);

        if (0 !== Object.keys(this.conditionSets).length) {

            // Create Candidate Equips with Set Equips
            Helper.log('Create Candidate Equips with Set Equips');

            candidateEquips = {};

            this.conditionEquips.forEach((equipType) => {
                if ('charm' === equipType) {
                    return;
                }

                if (Helper.isEmpty(candidateEquips[equipType])) {
                    candidateEquips[equipType] = {};
                }

                // Create Candidate Equips
                Object.keys(this.conditionSets).forEach((setId) => {
                    let equipInfos = ArmorDataset.typeIs(equipType).setIs(setId).getItems();

                    // Get Candidate Equips
                    candidateEquips[equipType] = this.createCandidateEquips(equipInfos, equipType, candidateEquips[equipType]);
                });

                // Append Empty Candidate Equip
                let candidateEquip = Helper.deepCopy(Constant.defaultCandidateEquip);
                candidateEquip.type = equipType;

                candidateEquips[equipType]['empty'] = candidateEquip;
            });

            this.conditionEquips.forEach((equipType) => {
                if ('charm' === equipType) {
                    return;
                }

                Helper.log('Equip Count:', equipType, Object.keys(candidateEquips[equipType]).length, candidateEquips[equipType]);
            });

            this.conditionEquips.forEach((equipType) => {
                if ('charm' === equipType) {
                    return;
                }

                Helper.log('Bundle Count:', equipType, Object.keys(prevBundleList).length);

                nextBundleList = {};

                Object.values(candidateEquips[equipType]).forEach((candidateEquip) => {
                    Object.keys(prevBundleList).forEach((hash) => {
                        let bundle = Helper.deepCopy(prevBundleList[hash]);

                        // Check Equip Part is Used
                        if (Helper.isNotEmpty(bundle.equips[equipType])) {
                            nextBundleList[this.generateBundleHash(bundle)] = bundle;

                            return;
                        }

                        // Check Candidate Equip Id
                        if (Helper.isEmpty(candidateEquip.id)) {
                            nextBundleList[this.generateBundleHash(bundle)] = bundle;

                            return;
                        }

                        // Add Candidate Equip to Bundle
                        bundle = this.addCandidateEquipToBundle(bundle, candidateEquip);

                        // Sets
                        let setRequire = this.conditionSets[candidateEquip.setId];

                        if (Helper.isEmpty(bundle.sets[candidateEquip.setId])) {
                            bundle.sets[candidateEquip.setId] = 0;
                        }

                        if (setRequire < bundle.sets[candidateEquip.setId]) {
                            bundle = Helper.deepCopy(prevBundleList[hash]);
                            nextBundleList[this.generateBundleHash(bundle)] = bundle;

                            return;
                        }

                        nextBundleList[this.generateBundleHash(bundle)] = bundle;
                    });
                });

                prevBundleList = nextBundleList;
            });

            Object.keys(this.conditionSets).forEach((setId) => {
                nextBundleList = {};

                let setRequire = this.conditionSets[setId];

                Object.keys(prevBundleList).forEach((hash) => {
                    let bundle = Helper.deepCopy(prevBundleList[hash]);

                    if (setRequire !== bundle.sets[setId]) {
                        return;
                    }

                    nextBundleList[this.generateBundleHash(bundle)] = bundle;
                });

                prevBundleList = nextBundleList;
            });

            Helper.log('Bundle Count:', Object.keys(prevBundleList).length);

            // Sets Require Equips is Overflow
            if (0 === Object.keys(prevBundleList).length) {
                return [];
            }
        }

        // Completed Skills
        Helper.log('Reset Completed Skills');

        nextBundleList = {};

        Object.keys(prevBundleList).forEach((hash) => {
            let bundle = Helper.deepCopy(prevBundleList[hash]);

            bundle.meta.completedSkills = {};

            Object.keys(bundle.skills).forEach((skillId) => {
                if (Helper.isEmpty(this.conditionSkills[skillId])) {
                    return;
                }

                let skillLevel = this.conditionSkills[skillId];

                if (skillLevel === bundle.skills[skillId]) {
                    bundle.meta.completedSkills[skillId] = true;
                }
            });

            nextBundleList[this.generateBundleHash(bundle)] = bundle;
        });

        prevBundleList = nextBundleList;

        // Create Candidate Equips with Skill & Slot Equips
        Helper.log('Create Candidate Equips with Skill & Slot Equips');

        candidateEquips = {};

        this.conditionEquips.forEach((equipType) => {
            if (Helper.isEmpty(candidateEquips[equipType])) {
                candidateEquips[equipType] = {};
            }

            // Create Candidate Equips
            Object.keys(this.conditionSkills).forEach((skillId) => {
                let equipInfos = null;

                // Get Equips With Skill
                if ('helm' === equipType
                    || 'chest' === equipType
                    || 'arm' === equipType
                    || 'waist' === equipType
                    || 'leg' === equipType
                ) {
                    equipInfos = ArmorDataset.typeIs(equipType).hasSkill(skillId).getItems();
                } else if ('charm' === equipType) {
                    equipInfos = CharmDataset.hasSkill(skillId).getItems();
                }

                // Get Candidate Equips
                candidateEquips[equipType] = this.createCandidateEquips(equipInfos, equipType, candidateEquips[equipType]);

                if ('charm' !== equipType) {

                    // Get Equips With Slot
                    equipInfos = ArmorDataset.typeIs(equipType).rareIs(0).getItems();

                    // Get Candidate Equips
                    candidateEquips[equipType] = this.createCandidateEquips(equipInfos, equipType, candidateEquips[equipType]);
                }
            });

            // Append Empty Candidate Equip
            let candidateEquip = Helper.deepCopy(Constant.defaultCandidateEquip);
            candidateEquip.type = equipType;

            candidateEquips[equipType]['empty'] = candidateEquip;
        });

        Object.keys(candidateEquips).forEach((equipType) => {
            if (Helper.isEmpty(this.maxEquipsExpectedValue[equipType])) {
                this.maxEquipsExpectedValue[equipType] = 0;
            }

            if (Helper.isEmpty(this.maxEquipsExpectedLevel[equipType])) {
                this.maxEquipsExpectedLevel[equipType] = 0;
            }

            Object.values(candidateEquips[equipType]).forEach((candidateEquip) => {
                if (this.maxEquipsExpectedValue[equipType] <= candidateEquip.expectedValue) {
                    this.maxEquipsExpectedValue[equipType] = candidateEquip.expectedValue;
                }

                if (this.maxEquipsExpectedLevel[equipType] <= candidateEquip.expectedLevel) {
                    this.maxEquipsExpectedLevel[equipType] = candidateEquip.expectedLevel;
                }
            });
        });

        this.conditionEquips.forEach((equipType) => {
            Helper.log('Equip Count:', equipType, Object.keys(candidateEquips[equipType]).length, candidateEquips[equipType]);
        });

        Helper.log('Equips Expected Value:', this.maxEquipsExpectedValue);
        Helper.log('Equips Expected Level:', this.maxEquipsExpectedLevel);

        // Create Next BundleList
        Helper.log('Create Next BundleList');

        this.conditionEquips.forEach((equipType) => {
            Helper.log('Bundle Count:', equipType, Object.keys(prevBundleList).length);

            this.usedEquipTypes[equipType] = true;

            nextBundleList = {};

            Object.values(candidateEquips[equipType]).forEach((candidateEquip) => {
                Object.keys(prevBundleList).forEach((hash) => {
                    let bundle = Helper.deepCopy(prevBundleList[hash]);

                    // Check Equip Part is Used
                    if (Helper.isNotEmpty(bundle.equips[equipType])) {
                        nextBundleList[this.generateBundleHash(bundle)] = bundle;

                        return;
                    }

                    // Check Candidate Equip Id
                    if (Helper.isEmpty(candidateEquip.id)) {
                        nextBundleList[this.generateBundleHash(bundle)] = bundle;

                        return;
                    }

                    // Add Candidate Equip to Bundle
                    bundle = this.addCandidateEquipToBundle(bundle, candidateEquip);

                    // Check Bundle Have a Future
                    if (false === this.isBundleHaveFuture(bundle)) {
                        return;
                    }

                    // Count & Check Skills from Candidate Equip
                    let isSkip = false;

                    Object.keys(candidateEquip.skills).forEach((skillId) => {
                        if (true === isSkip) {
                            return;
                        }

                        if (Helper.isEmpty(this.conditionSkills[skillId])) {
                            return;
                        }

                        let skillLevel = this.conditionSkills[skillId];

                        if (skillLevel < bundle.skills[skillId]) {
                            bundle = Helper.deepCopy(prevBundleList[hash]);
                            nextBundleList[this.generateBundleHash(bundle)] = bundle;

                            isSkip = true;

                            return;
                        }

                        if (skillLevel === bundle.skills[skillId]) {
                            bundle.meta.completedSkills[skillId] = true;
                        }
                    });

                    if (true === isSkip) {
                        return;
                    }

                    if (requireSkillCount === Object.keys(bundle.meta.completedSkills).length) {
                        lastBundleList[this.generateBundleHash(bundle)] = bundle;

                        return;
                    }

                    // If Equips Is Full Then Do Fully Check
                    if (requireEquipCount === bundle.meta.equipCount) {

                        // Completed Bundle By Skills
                        bundle = this.completeBundleBySkills(bundle);

                        if (false === bundle) {
                            return;
                        }

                        if (requireSkillCount === Object.keys(bundle.meta.completedSkills).length) {
                            lastBundleList[this.generateBundleHash(bundle)] = bundle;
                        }

                        return;
                    }

                    nextBundleList[this.generateBundleHash(bundle)] = bundle;
                });
            });

            prevBundleList = nextBundleList;

            Helper.log('Result: Bundle Count (Pre):', Object.keys(lastBundleList).length);
        });

        // Find Completed Bundle into Last BundleList
        Helper.log('Find Completed Bundles');

        Helper.log('Bundle List:', Object.keys(prevBundleList).length);

        nextBundleList = {};

        Object.keys(prevBundleList).forEach((hash) => {
            let bundle = Helper.deepCopy(prevBundleList[hash]);

            // Completed Bundle By Skills
            bundle = this.completeBundleBySkills(bundle);

            if (false === bundle) {
                return;
            }

            if (requireSkillCount === Object.keys(bundle.meta.completedSkills).length) {
                lastBundleList[this.generateBundleHash(bundle)] = bundle;
            }
        });

        Helper.log('Result: Bundle Count (Final):', Object.keys(lastBundleList).length);

        switch (this.algorithmParams.sort) {
        case 'complex':
            lastBundleList = Object.values(lastBundleList).sort((bundleA, bundleB) => {
                let valueA = (8 - bundleA.meta.equipCount) * 1000 + bundleA.defense;
                let valueB = (8 - bundleB.meta.equipCount) * 1000 + bundleB.defense;

                return valueB - valueA;
            });

            break;
        case 'defense':
            lastBundleList = Object.values(lastBundleList).sort((bundleA, bundleB) => {
                let valueA = bundleA.defense;
                let valueB = bundleB.defense;

                return valueB - valueA;
            });

            break;
        case 'amount':
            lastBundleList = Object.values(lastBundleList).sort((bundleA, bundleB) => {
                let valueA = bundleA.meta.equipCount;
                let valueB = bundleB.meta.equipCount;

                return valueB - valueA;
            });

            break;
        case 'slot':
            lastBundleList = Object.values(lastBundleList).sort((bundleA, bundleB) => {
                let valueA = bundleA.meta.remainingSlotCount.all;
                let valueB = bundleB.meta.remainingSlotCount.all;

                return valueB - valueA;
            });

            break;
        case 'expectedValue':
            lastBundleList = Object.values(lastBundleList).sort((bundleA, bundleB) => {
                let valueA = bundleA.meta.expectedValue;
                let valueB = bundleB.meta.expectedValue;

                return valueB - valueA;
            });

            break;
        case 'expectedLevel':
            lastBundleList = Object.values(lastBundleList).sort((bundleA, bundleB) => {
                let valueA = bundleA.meta.expectedLevel;
                let valueB = bundleB.meta.expectedLevel;

                return valueB - valueA;
            });

            break;
        }

        return lastBundleList.slice(0, this.algorithmParams.limit);
    };

    /**
     * Generate Bundle Hash
     */
    generateBundleHash = (bundle) => {
        let equips = {};
        let jewels = {};

        Object.keys(bundle.equips).forEach((equipType) => {
            if (Helper.isEmpty(bundle.equips[equipType])) {
                return;
            }

            equips[equipType] = bundle.equips[equipType];
        });

        Object.keys(bundle.jewels).sort().forEach((jewelId) => {
            if (0 === bundle.jewels[jewelId]) {
                return;
            }

            jewels[jewelId] = bundle.jewels[jewelId];
        });

        return MD5(JSON.stringify([equips, jewels]));
    };

    /**
     * Create Candidate Equips
     */
    createCandidateEquips = (equipInfos, equipType, candidateEquips = {}) => {
        equipInfos.forEach((equipInfo) => {

            // Check is Armor Factor
            if (false === this.algorithmParams.armorFactor[equipInfo.rare]) {
                return;
            }

            let candidateEquip = this.convertEquipToCandidateEquip(equipInfo, equipType);

            // Check is Skip Equips
            if (true === this.isSkipCandidateEquip(candidateEquip)) {
                return;
            }

            // Check Used Equips
            if (true === this.usedEquips[candidateEquip.id]) {
                return;
            }

            // Set Used Candidate Equip Id
            this.usedEquips[candidateEquip.id] = true;

            // Set Candidate Equip
            candidateEquips[candidateEquip.id] = candidateEquip;
        });

        return candidateEquips;
    };

    /**
     * Convert Equip To Candidate Equip
     */
    convertEquipToCandidateEquip = (equip, equipType) => {
        let candidateEquip = Helper.deepCopy(Constant.defaultCandidateEquip);

        // Set Id, Type & Defense
        candidateEquip.id = equip.id;
        candidateEquip.type = ('charm' !== equipType) ? equip.type : equipType;
        candidateEquip.defense = (Helper.isNotEmpty(equip.defense)) ? equip.defense : 0;

        if (Helper.isNotEmpty(equip.set)) {
            candidateEquip.setId = equip.set.id;
        }

        if (Helper.isEmpty(equip.skills)) {
            equip.skills = [];
        }

        if (Helper.isEmpty(equip.slots)) {
            equip.slots = [];
        }

        equip.skills.forEach((skill) => {
            candidateEquip.skills[skill.id] = skill.level;

            // Increase Expected Value & Level
            if (Helper.isNotEmpty(this.correspondJewels[skill.id])) {
                let jewel = this.correspondJewels[skill.id];

                if (Helper.isNotEmpty(jewel)) {
                    candidateEquip.expectedValue += skill.level * jewel.size; // 1, 2, 3, 4
                } else {
                    candidateEquip.expectedValue += skill.level * 5;
                }

                candidateEquip.expectedLevel += skill.level;
            }
        });

        equip.slots.forEach((slot) => {
            candidateEquip.ownSlotCount[slot.size] += 1;

            // Increase Expected Value & Level
            candidateEquip.expectedValue += slot.size;
            candidateEquip.expectedLevel += 1;
        });

        return candidateEquip;
    };

    isSkipCandidateEquip = (candidateEquip) => {

        let isSkip = false;

        Object.keys(candidateEquip.skills).forEach((skillId) => {
            if (true === isSkip) {
                return;
            }

            if (Helper.isNotEmpty(this.skipSkills[skillId])
                && true === this.skipSkills[skillId]
            ) {
                isSkip = true;
            }
        });

        return isSkip;
    };

    /**
     * Is Bundle Have Future
     *
     * This is magic function, which is see through the future
     */
    isBundleHaveFuture = (bundle) => {
        let currentExpectedValue = bundle.meta.expectedValue;
        let currentExpectedLevel = bundle.meta.expectedLevel;

        if (currentExpectedValue >= this.conditionExpectedValue
            && currentExpectedLevel >= this.conditionExpectedLevel
        ) {
            return true;
        }

        let haveFuture = false;

        this.conditionEquips.forEach((equipType) => {
            if (true === haveFuture) {
                return;
            }

            if (true === this.usedEquipTypes[equipType]) {
                return;
            }

            currentExpectedValue += this.maxEquipsExpectedValue[equipType];
            currentExpectedLevel += this.maxEquipsExpectedLevel[equipType];

            if (currentExpectedValue >= this.conditionExpectedValue
                && currentExpectedLevel >= this.conditionExpectedLevel
            ) {
                haveFuture = true;
            }
        });

        return haveFuture;
    };

    /**
     * Add Candidate Equip To Bundle
     */
    addCandidateEquipToBundle = (bundle, candidateEquip) => {
        if (Helper.isEmpty(candidateEquip.id)) {
            return bundle;
        }

        if (Helper.isNotEmpty(bundle.equips[candidateEquip.type])) {
            return bundle;
        }

        bundle.equips[candidateEquip.type] = candidateEquip.id;
        bundle.defense += candidateEquip.defense;

        if (Helper.isNotEmpty(candidateEquip.setId)) {
            if (Helper.isEmpty(bundle.sets[candidateEquip.setId])) {
                bundle.sets[candidateEquip.setId] = 0;
            }

            bundle.sets[candidateEquip.setId] += 1;
        }

        Object.keys(candidateEquip.skills).forEach((skillId) => {
            let skillLevel = candidateEquip.skills[skillId];

            if (Helper.isEmpty(bundle.skills[skillId])) {
                bundle.skills[skillId] = 0;
            }

            bundle.skills[skillId] += skillLevel;
        });

        for (let size = 1; size <= 3; size++) {
            bundle.meta.remainingSlotCount[size] += candidateEquip.ownSlotCount[size];
            bundle.meta.remainingSlotCount.all += candidateEquip.ownSlotCount[size];
        }

        // Increase Equip Count
        bundle.meta.equipCount += 1;

        // Increase Expected Value & Level
        bundle.meta.expectedValue += candidateEquip.expectedValue;
        bundle.meta.expectedLevel += candidateEquip.expectedLevel;

        return bundle;
    };

    /**
     * Complete Bundle By Skills
     */
    completeBundleBySkills = (bundle) => {
        let isSkip = false;

        Object.keys(this.conditionSkills).forEach((skillId) => {
            if (true === isSkip) {
                return;
            }

            let skillLevel = this.conditionSkills[skillId];

            if (Helper.isEmpty(bundle.skills[skillId])) {
                bundle.skills[skillId] = 0
            }

            // Add Jewel to Bundle
            bundle = this.addJewelToBundleBySpecificSkill(bundle, {
                id: skillId,
                level: skillLevel
            }, this.correspondJewels[skillId]);

            if (false === bundle) {
                isSkip = true;

                return;
            }

            if (skillLevel === bundle.skills[skillId]) {
                bundle.meta.completedSkills[skillId] = true;
            }
        });

        if (true === isSkip) {
            return false;
        }

        return bundle;
    };

    /**
     * Add Jewel To Bundle By Specific Skill
     */
    addJewelToBundleBySpecificSkill = (bundle, skill, jewel) => {
        let diffSkillLevel = skill.level - bundle.skills[skill.id];

        if (0 === diffSkillLevel) {
            return bundle;
        }

        // Failed - No Jewel
        if (Helper.isEmpty(jewel) && 0 !== diffSkillLevel) {
            return false;
        }

        let currentSlotSize = jewel.size;
        let usedSlotCount = {
            1: 0,
            2: 0,
            3: 0
        };

        while (true) {
            if (0 !== bundle.meta.remainingSlotCount[currentSlotSize]) {
                if (diffSkillLevel > bundle.meta.remainingSlotCount[currentSlotSize]) {
                    usedSlotCount[currentSlotSize] = bundle.meta.remainingSlotCount[currentSlotSize];
                    diffSkillLevel -= bundle.meta.remainingSlotCount[currentSlotSize];
                } else {
                    usedSlotCount[currentSlotSize] = diffSkillLevel;
                    diffSkillLevel = 0;
                }
            }

            currentSlotSize += 1;

            if (0 === diffSkillLevel) {
                break;
            }

            // Failed - No Slots
            if (3 < currentSlotSize) {
                return false;
            }
        }

        if (Helper.isEmpty(bundle.skills[skill.id])) {
            bundle.skills[skill.id] = 0;
        }

        if (Helper.isEmpty(bundle.jewels[jewel.id])) {
            bundle.jewels[jewel.id] = 0;
        }

        diffSkillLevel = skill.level - bundle.skills[skill.id];

        bundle.skills[skill.id] += diffSkillLevel;
        bundle.jewels[jewel.id] += diffSkillLevel;

        Object.keys(usedSlotCount).forEach((slotSize) => {
            bundle.meta.remainingSlotCount[slotSize] -= usedSlotCount[slotSize];
            bundle.meta.remainingSlotCount.all -= usedSlotCount[slotSize];
        });

        return bundle;
    };
}

export default new FittingAlgorithm();
