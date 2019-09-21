'use strict';
/**
 * Candidate Bundles
 *
 * @package     MHW Calculator
 * @author      Scar Wu
 * @copyright   Copyright (c) Scar Wu (http://scar.tw)
 * @link        https://github.com/scarwu/MHWCalculator
 */

// Load Libraries
import React, { Fragment, useState, useEffect } from 'react';

// Load Core Libraries
import Helper from 'core/helper';

// Load Custom Libraries
import _ from 'libraries/lang';
import WeaponDataset from 'libraries/dataset/weapon';
import ArmorDataset from 'libraries/dataset/armor';
import CharmDataset from 'libraries/dataset/charm';
import JewelDataset from 'libraries/dataset/jewel';
import SkillDataset from 'libraries/dataset/skill';
import CommonDataset from 'libraries/dataset/common';
import FittingAlgorithm from 'libraries/fittingAlgorithm';

// Load Components
import FunctionalButton from 'components/common/functionalButton';

// Load Config & Constant
import Config from 'config';
import Constant from 'constant';

// Load State Control
import CommonState from 'states/common';
import ModalState from 'states/modal';

export default function CandidateBundles(props) {

    /**
     * Hooks
     */
    const [stateComputedBundles, updateComputedBundles] = useState(CommonState.getter.getComputedBundles());
    const [stateIsSearching, updateIsSearching] = useState(false);

    // Like Did Mount & Will Unmount Cycle
    useEffect(() => {
        const unsubscribe = CommonState.store.subscribe(() => {
            updateComputedBundles(CommonState.getter.getComputedBundles());
        });

        return () => {
            unsubscribe();
        };
    }, []);

    /**
     * Handle Functions
     */
    let handleCandidateBundlesSearch = () => {
        let requiredSets = CommonState.getter.getRequiredSets();
        let requiredSkills = CommonState.getter.getRequiredSkills();
        let requiredEquipPins = CommonState.getter.getRequiredEquipPins();
        let currentEquips = CommonState.getter.getCurrentEquips();
        let inventory = CommonState.getter.getInventory();
        let algorithmParams = CommonState.getter.getAlgorithmParams();

        // Create Required Equips
        let requiredEquips = {};

        ['weapon', 'helm', 'chest', 'arm', 'waist', 'leg', 'charm'].forEach((equipType) => {
            if (false === requiredEquipPins[equipType]) {
                return;
            }

            requiredEquips[equipType] = currentEquips[equipType];
        });

        updateIsSearching(true);

        setTimeout(() => {
            let startTime = new Date().getTime();
            let computedBundles = FittingAlgorithm.search(
                requiredSets,
                requiredSkills,
                requiredEquips,
                inventory,
                algorithmParams
            );
            let stopTime = new Date().getTime();
            let searchTime = (stopTime - startTime) / 1000;
            let weaponEnhanceIds = Helper.isNotEmpty(requiredEquips.weapon)
                ? requiredEquips.weapon.enhanceIds : null;

            computedBundles.map((bundle) => {
                bundle.meta.weaponEnhanceIds = weaponEnhanceIds;

                return bundle;
            });

            Helper.log('Bundle List:', computedBundles);
            Helper.log('Search Time:', searchTime);

            CommonState.setter.saveComputedBundles(computedBundles);

            updateIsSearching(false);
        }, 100);
    };

    let handleBundlePickUp = (index) => {
        let bundle = stateComputedBundles[index];
        let equips = Helper.deepCopy(CommonState.getter.getCurrentEquips());
        let slotMap = {
            1: [],
            2: [],
            3: []
        };

        Object.keys(bundle.equips).forEach((equipType) => {
            if (Helper.isEmpty(bundle.equips[equipType])) {
                return;
            }

            equips[equipType].id = bundle.equips[equipType];
            equips[equipType].slotIds = {};

            let equipInfo = null;

            if ('weapon' === equipType) {
                if (Helper.isNotEmpty(bundle.meta.weaponEnhanceIds)) {
                    equips.weapon.enhanceIds = bundle.meta.weaponEnhanceIds; // Restore Enhance
                }

                equipInfo = CommonDataset.getAppliedWeaponInfo(equips.weapon);
            } else if ('helm' === equipType
                || 'chest' === equipType
                || 'arm' === equipType
                || 'waist' === equipType
                || 'leg' === equipType
            ) {
                equipInfo = CommonDataset.getAppliedArmorInfo(equips[equipType]);
            }

            if (Helper.isEmpty(equipInfo)) {
                return;
            }

            equipInfo.slots.forEach((data, index) => {
                slotMap[data.size].push({
                    type: equipType,
                    index: index
                });
            });
        });

        Object.keys(bundle.jewels).sort((jewelIdA, jewelIdB) => {
            let jewelInfoA = JewelDataset.getInfo(jewelIdA);
            let jewelInfoB = JewelDataset.getInfo(jewelIdB);

            if (Helper.isEmpty(jewelInfoA) || Helper.isEmpty(jewelInfoB)) {
                return 0;
            }

            return jewelInfoA.size - jewelInfoB.size;
        }).forEach((jewelId) => {
            let jewelInfo = JewelDataset.getInfo(jewelId);

            if (Helper.isEmpty(jewelInfo)) {
                return;
            }

            let currentSize = jewelInfo.size;

            let jewelCount = bundle.jewels[jewelId];
            let data = null

            let jewelIndex = 0;

            while (jewelIndex < jewelCount) {
                if (0 === slotMap[currentSize].length) {
                    currentSize++;

                    continue;
                }

                data = slotMap[currentSize].shift();

                equips[data.type].slotIds[data.index] = jewelId;

                jewelIndex++;
            }
        });

        CommonState.setter.replaceCurrentEquips(equips);
    };

    /**
     * Render Functions
     */
    let renderBundleItems = () => {
        let totalBundle = stateComputedBundles.length;

        return stateComputedBundles.map((data, index) => {
            return (
                <div key={index} className="mhwc-item mhwc-item-3-step">
                    <div className="col-12 mhwc-name">
                        <span>{_('bundle')}: {index + 1} / {totalBundle}</span>
                        <div className="mhwc-icons_bundle">
                            <FunctionalButton
                                iconName="check" altName={_('equip')}
                                onClick={() => {handleBundlePickUp(index)}} />
                        </div>
                    </div>

                    <div className="col-12 mhwc-content">
                        <div className="col-12 mhwc-name">
                            <span>{_('equip')}</span>
                        </div>
                        <div className="col-12 mhwc-content">
                            {Object.keys(data.equips).map((equipType, index) => {
                                if (Helper.isEmpty(data.equips[equipType])) {
                                    return false;
                                }

                                let equipInfo = null;

                                if ('weapon' === equipType) {
                                    equipInfo = WeaponDataset.getInfo(data.equips[equipType]);
                                } else if ('helm' === equipType
                                    || 'chest' === equipType
                                    || 'arm' === equipType
                                    || 'waist' === equipType
                                    || 'leg' === equipType
                                ) {
                                    equipInfo = ArmorDataset.getInfo(data.equips[equipType]);
                                } else if ('charm' === equipType) {
                                    equipInfo = CharmDataset.getInfo(data.equips[equipType]);
                                }

                                return Helper.isNotEmpty(equipInfo) ? (
                                    <Fragment key={equipType}>
                                        <div className="col-2 mhwc-name">
                                            <span>{_(equipType)}</span>
                                        </div>
                                        <div className="col-4 mhwc-value">
                                            <span>{_(equipInfo.name)}</span>
                                        </div>
                                    </Fragment>
                                ) : false;
                            })}
                        </div>
                    </div>

                    <div className="col-12 mhwc-content">
                        <div className="col-4 mhwc-name">
                            <span>{_('defense')}</span>
                        </div>
                        <div className="col-8 mhwc-value">
                            <span>{data.defense}</span>
                        </div>
                    </div>

                    {(0 < data.meta.remainingSlotCount.all) ? (
                        <div className="col-12 mhwc-content">
                            <div className="col-12 mhwc-name">
                                <span>{_('remainingSlot')}</span>
                            </div>
                            <div className="col-12 mhwc-content">
                                {Object.keys(data.meta.remainingSlotCount).map((slotSize) => {
                                    if ('all' === slotSize) {
                                        return;
                                    }

                                    let slotCount = data.meta.remainingSlotCount[slotSize];

                                    return (slotCount > 0) ? (
                                        <div key={slotSize} className="col-4 mhwc-value">
                                            <span>{`[${slotSize}] x ${slotCount}`}</span>
                                        </div>
                                    ) : false;
                                })}
                            </div>
                        </div>
                    ) : false}

                    {(0 !== Object.keys(data.jewels).length) ? (
                        <div className="col-12 mhwc-content">
                            <div className="col-12 mhwc-name">
                                <span>{_('jewel')}</span>
                            </div>
                            <div className="col-12 mhwc-content">
                                {Object.keys(data.jewels).sort((jewelIdA, jewelIdB) => {
                                    return data.jewels[jewelIdB] - data.jewels[jewelIdA];
                                }).map((jewelId) => {
                                    let jewelCount = data.jewels[jewelId];
                                    let jewelInfo = JewelDataset.getInfo(jewelId);

                                    return (Helper.isNotEmpty(jewelInfo)) ? (
                                        <div key={jewelId} className="col-4 mhwc-value">
                                            <span>{`[${jewelInfo.size}] ${_(jewelInfo.name)} x ${jewelCount}`}</span>
                                        </div>
                                    ) : false;
                                })}
                            </div>
                        </div>
                    ) : false}

                    {(0 !== Object.keys(data.skills).length) ? (
                        <div className="col-12 mhwc-content">
                            <div className="col-12 mhwc-name">
                                <span>{_('skill')}</span>
                            </div>
                            <div className="col-12 mhwc-content">
                                {Object.keys(data.skills).sort((skillIdA, skillIdB) => {
                                    return data.skills[skillIdB] - data.skills[skillIdA];
                                }).map((skillId) => {
                                    let skillCount = data.skills[skillId];
                                    let skillInfo = SkillDataset.getInfo(skillId);;

                                    return (Helper.isNotEmpty(skillInfo)) ? (
                                        <div key={skillId} className="col-6 mhwc-value">
                                            <span>{`${_(skillInfo.name)} Lv.${skillCount}`}</span>
                                        </div>
                                    ) : false;
                                })}
                            </div>
                        </div>
                    ) : false}
                </div>
            );
        });
    };

    return (
        <div className="col mhwc-bundles">
            <div className="mhwc-panel">
                <span className="mhwc-title">{_('candidateBundle')}</span>

                <div className="mhwc-icons_bundle">
                    <FunctionalButton
                        iconName="refresh" altName={_('reset')}
                        onClick={CommonState.setter.cleanComputedBundles} />
                    {'production' !== Config.env ? <FunctionalButton
                        iconName="cog" altName={_('setting')}
                        onClick={ModalState.setter.showAlgorithmSetting} /> : false}
                    <FunctionalButton
                        iconName="search" altName={_('search')}
                        onClick={handleCandidateBundlesSearch} />
                </div>
            </div>

            <div key="list" className="mhwc-list">
                {true === stateIsSearching ? (
                    <div className="mhwc-loading">
                        <i className="fa fa-spin fa-spinner"></i>
                    </div>
                ) : false}

                {renderBundleItems()}
            </div>
        </div>
    );
}
