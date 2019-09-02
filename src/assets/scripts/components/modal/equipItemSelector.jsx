'use strict';
/**
 * Equip Item Selector
 *
 * @package     MHW Calculator
 * @author      Scar Wu
 * @copyright   Copyright (c) Scar Wu (http://scar.tw)
 * @link        https://github.com/scarwu/MHWCalculator
 */

// Load Libraries
import React, { Component } from 'react';

// Load Core Libraries
import Status from 'core/status';
import Helper from 'core/helper';

// Load Custom Libraries
import _ from 'libraries/lang';
import WeaponDataset from 'libraries/dataset/weapon';
import ArmorDataset from 'libraries/dataset/armor';
import CharmDataset from 'libraries/dataset/charm';
import JewelDataset from 'libraries/dataset/jewel';
import EnhanceDataset from 'libraries/dataset/enhance';
import SetDataset from 'libraries/dataset/set';
import SkillDataset from 'libraries/dataset/skill';

// Load Components
import FunctionalIcon from 'components/common/functionalIcon';
import SharpnessBar from 'components/common/sharpnessBar';

// Load Constant
import Constant from 'constant';

// Load State Control
import CommonStates from 'states/common';
import ModalStates from 'states/modal';

export default class EquipItemSelector extends Component {

    // Default Props
    static defaultProps = {
        onPickUp: (data) => {},
        onToggle: (data) => {}
    };

    constructor (props) {
        super(props);

        // Initial State
        this.state = {
            data: ModalStates.getters.getEquipItemSelectorData(),
            isShow: ModalStates.getters.isShowEquipItemSelector(),
            mode: null,
            includeList: [],
            ignoreList: [],
            type: null,
            rare: 8,
            segment: null
        };
    }

    /**
     * Handle Functions
     */
    handleFastWindowClose = (event) => {
        if (this.refs.modal !== event.target) {
            return;
        }

        this.handleWindowClose();
    };

    handleWindowClose = () => {
        ModalStates.setters.hideEquipItemSelector();
    };

    handleItemPickUp = (itemId) => {
        let data = this.state.data;

        if (Helper.isNotEmpty(data.enhanceIndex)) {
            data.enhanceId = itemId;
        } else if (Helper.isNotEmpty(data.slotIndex)) {
            data.slotId = itemId;
        } else {
            data.equipId = itemId;
        }

        this.props.onPickUp(data);
        this.handleWindowClose();
    };

    handleItemToggle = (itemType, itemId) => {
        this.props.onToggle({
            type: itemType,
            id: itemId
        });
    };

    handleSegmentInput = () => {
        let segment = this.refs.segment.value;

        segment = (0 !== segment.length)
            ? segment.replace(/([.?*+^$[\]\\(){}|-])/g, '').trim() : null;

        this.setState({
            segment: segment
        });
    };

    handleTypeChange = () => {
        let type = this.refs.type.value;

        this.setState({
            type: type
        });
    };

    handleRareChange = () => {
        let rare = this.refs.rare.value;

        this.setState({
            rare: parseInt(rare, 10)
        });
    };

    /**
     * Lifecycle Functions
     */
    static getDerivedStateFromProps (nextProps, prevState) {
        let mode = null;
        let includeList = [];
        let ignoreList = [];
        let type = null;

        if (null === prevState.data) {
            return {};
        }

        if (Helper.isNotEmpty(prevState.data.enhanceIndex)) {
            mode = 'enhance';
            includeList = EnhanceDataset.getItems();
        } else if (Helper.isNotEmpty(prevState.data.slotIndex)) {
            mode = 'jewel';

            for (let size = prevState.data.slotSize; size >= 1; size--) {
                for (let rare = 8; rare >= 5; rare--) {
                    includeList = includeList.concat(
                        JewelDataset.rareIs(rare).sizeIsEqualThen(size).getItems()
                    );
                }
            }
        } else if ('weapon' === prevState.data.equipType) {
            let weaponInfo = WeaponDataset.getInfo(prevState.data.equipId);

            mode = 'weapon';
            type = (Helper.isNotEmpty(weaponInfo)) ? weaponInfo.type : Constant.weaponTypes[0];

            Constant.weaponTypes.forEach((weaponType) => {
                for (let rare = 8; rare >= 5; rare--) {
                    WeaponDataset.typeIs(weaponType).rareIs(rare).getItems().forEach((equip) => {
                        if (Helper.isNotEmpty(nextProps.ignoreEquips['weapon'])
                            && true === nextProps.ignoreEquips['weapon'][equip.id]
                        ) {
                            ignoreList.push(equip);
                        } else {
                            includeList.push(equip);
                        }
                    });
                }

                WeaponDataset.typeIs(weaponType).rareIs(0).getItems().forEach((equip) => {
                    if (Helper.isNotEmpty(nextProps.ignoreEquips['weapon'])
                        && true === nextProps.ignoreEquips['weapon'][equip.id]
                    ) {
                        ignoreList.push(equip);
                    } else {
                        includeList.push(equip);
                    }
                });
            });
        } else if ('helm' === prevState.data.equipType
            || 'chest' === prevState.data.equipType
            || 'arm' === prevState.data.equipType
            || 'waist' === prevState.data.equipType
            || 'leg' === prevState.data.equipType
        ) {
            mode = 'armor';
            type = prevState.data.equipType;

            for (let rare = 8; rare >= 5; rare--) {
                ArmorDataset.typeIs(prevState.data.equipType).rareIs(rare).getItems().forEach((equip) => {
                    if (Helper.isNotEmpty(nextProps.ignoreEquips[equip.type])
                        && true === nextProps.ignoreEquips[equip.type][equip.id]
                    ) {
                        ignoreList.push(equip);
                    } else {
                        includeList.push(equip);
                    }
                });
            }

            ArmorDataset.typeIs(prevState.data.equipType).rareIs(0).getItems().forEach((equip) => {
                if (Helper.isNotEmpty(nextProps.ignoreEquips[equip.type])
                    && true === nextProps.ignoreEquips[equip.type][equip.id]
                ) {
                    ignoreList.push(equip);
                } else {
                    includeList.push(equip);
                }
            });
        } else if ('charm' === prevState.data.equipType) {
            mode = 'charm';

            CharmDataset.getItems().forEach((equip) => {
                if (Helper.isNotEmpty(nextProps.ignoreEquips['charm'])
                    && true === nextProps.ignoreEquips['charm'][equip.id]
                ) {
                    ignoreList.push(equip);
                } else {
                    includeList.push(equip);
                }
            });
        }

        let state = {
            mode: mode,
            includeList: includeList,
            ignoreList: ignoreList
        };

        if (Helper.isEmpty(prevState.type)) {
            state.type = type;
        }

        return state;
    }

    componentDidMount () {
        this.unsubscribe = ModalStates.store.subscribe(() => {
            this.setState({
                data: ModalStates.getters.getEquipItemSelectorData(),
                isShow: ModalStates.getters.isShowEquipItemSelector()
            });
        });
    }

    componentWillUnmount(){
        this.unsubscribe();
    }

    /**
     * Render Functions
     */
    renderWeaponRow = (data, index, isIgnore) => {
        let originalSharpness = null;
        let enhancedSharpness = null;

        if (Helper.isNotEmpty(data.sharpness)) {
            originalSharpness = Helper.deepCopy(data.sharpness);
            enhancedSharpness = Helper.deepCopy(data.sharpness);
            enhancedSharpness.value += 50;
        }

        if (Helper.isNotEmpty(data.element.attack)
            && Helper.isEmpty(data.element.attack.maxValue)
        ) {
            data.element.attack.maxValue = '?';
        }

        if (Helper.isNotEmpty(data.element.status)
            && Helper.isEmpty(data.element.status.maxValue)
        ) {
            data.element.status.maxValue = '?';
        }

        return (
            <tr key={data.id}>
                <td><span>{_(data.name)}</span></td>
                <td><span>{_(data.series)}</span></td>
                <td><span>{data.rare}</span></td>
                <td><span>{data.attack}</span></td>
                <td className="mhwc-sharpness">
                    {Helper.isNotEmpty(data.sharpness) ? <SharpnessBar data={originalSharpness} /> :  false}
                    {Helper.isNotEmpty(data.sharpness) ? <SharpnessBar data={enhancedSharpness} /> :  false}
                </td>
                <td><span>{data.criticalRate}%</span></td>
                <td>
                    {Helper.isNotEmpty(data.element.attack) ? (
                        <div>
                            <span>{_(data.element.attack.type)}</span>
                            &nbsp;
                            {data.element.attack.isHidden ? (
                                <span key="value_1">({data.element.attack.minValue}-{data.element.attack.maxValue})</span>
                            ) : (
                                <span key="value_2">{data.element.attack.minValue}-{data.element.attack.maxValue}</span>
                            )}
                        </div>
                    ) : false}

                    {Helper.isNotEmpty(data.element.status) ? (
                        <div>
                            <span>{_(data.element.status.type)}</span>
                            &nbsp;
                            {data.element.status.isHidden ? (
                                <span key="value_1">({data.element.status.minValue}-{data.element.status.maxValue})</span>
                            ) : (
                                <span key="value_2">{data.element.status.minValue}-{data.element.status.maxValue}</span>
                            )}
                        </div>
                    ) : false}
                </td>
                <td>
                    {Helper.isNotEmpty(data.elderseal) ? (
                        <span>{_(data.elderseal.affinity)}</span>
                    ) : false}
                </td>
                <td><span>{data.defense}</span></td>
                <td>
                    {data.slots.map((data, index) => {
                        return (
                            <span key={index}>[{data.size}]</span>
                        );
                    })}
                </td>
                <td>
                    {data.skills.map((data, index) => {
                        let skillInfo = SkillDataset.getInfo(data.id);

                        return (Helper.isNotEmpty(skillInfo)) ? (
                            <div key={index}>
                                <span>{_(skillInfo.name)} Lv.{data.level}</span>
                            </div>
                        ) : false;
                    })}
                </td>
                <td>
                    <div className="mhwc-icons_bundle">
                        <FunctionalIcon
                            iconName={isIgnore ? 'star-o' : 'star'}
                            altName={isIgnore ? _('include') : _('exclude')}
                            onClick={() => {this.handleItemToggle('weapon', data.id)}} />

                        {(this.state.data.equipId !== data.id) ? (
                            <FunctionalIcon
                                iconName="check" altName={_('select')}
                                onClick={() => {this.handleItemPickUp(data.id)}} />
                        ) : false}
                    </div>
                </td>
            </tr>
        );
    };

    renderWeaponTable = () => {
        let segment = this.state.segment;

        return (
            <table className="mhwc-weapon_table">
                <thead>
                    <tr>
                        <td>{_('name')}</td>
                        <td>{_('series')}</td>
                        <td>{_('rare')}</td>
                        <td>{_('attack')}</td>
                        <td>{_('sharpness')}</td>
                        <td>{_('criticalRate')}</td>
                        <td>{_('element')}</td>
                        <td>{_('elderseal')}</td>
                        <td>{_('defense')}</td>
                        <td>{_('slot')}</td>
                        <td>{_('skill')}</td>
                        <td></td>
                    </tr>
                </thead>
                <tbody>
                    {this.state.includeList.map((data, index) => {

                        if (data.type !== this.state.type) {
                            return;
                        }

                        if (data.rare !== this.state.rare) {
                            return;
                        }

                        // Create Text
                        let text = _(data.name);
                        text += _(data.series);
                        text += _(data.type);

                        if (Helper.isNotEmpty(data.element)
                            && Helper.isNotEmpty(data.element.attack)
                        ) {
                            text += _(data.element.attack.type);
                        }

                        if (Helper.isNotEmpty(data.element)
                            && Helper.isNotEmpty(data.element.status)
                        ) {
                            text += _(data.element.status.type);
                        }

                        data.skills.forEach((data) => {
                            let skillInfo = SkillDataset.getInfo(data.id);

                            if (Helper.isNotEmpty(skillInfo)) {
                                text += _(skillInfo.name);
                            }
                        });

                        // Search Nameword
                        if (Helper.isNotEmpty(segment)
                            && -1 === text.toLowerCase().search(segment.toLowerCase())
                        ) {
                            return false;
                        }

                        return this.renderWeaponRow(data, index, false);
                    })}

                    {this.state.ignoreList.map((data, index) => {
                        return this.renderWeaponRow(data, index, true);
                    })}
                </tbody>
            </table>
        );
    };

    renderArmorRow = (data, index, isIgnore) => {
        let skillInfo = null;

        if (Helper.isNotEmpty(data.set)) {
            skillInfo = SetDataset.getInfo(data.set.id);
        }

        return (
            <tr key={data.id}>
                <td><span>{_(data.name)}</span></td>
                <td><span>{_(data.series)}</span></td>
                <td><span>{data.rare}</span></td>
                <td><span>{data.defense}</span></td>
                <td>
                    <div><span>{_('fire')} {data.resistance.fire}</span></div>
                    <div><span>{_('water')} {data.resistance.water}</span></div>
                    <div><span>{_('thunder')} {data.resistance.thunder}</span></div>
                    <div><span>{_('ice')} {data.resistance.ice}</span></div>
                    <div><span>{_('dragon')} {data.resistance.dragon}</span></div>
                </td>
                <td>
                    {data.slots.map((data, index) => {
                        return (
                            <span key={index}>[{data.size}]</span>
                        );
                    })}
                </td>
                <td>
                    {(Helper.isNotEmpty(skillInfo)) ? (
                        <span>{_(skillInfo.name)}</span>
                    ) : false}
                </td>
                <td>
                    {data.skills.map((data, index) => {
                        let skillInfo = SkillDataset.getInfo(data.id);

                        return (Helper.isNotEmpty(skillInfo)) ? (
                            <div key={index}>
                                <span>{_(skillInfo.name)} Lv.{data.level}</span>
                            </div>
                        ) : false;
                    })}
                </td>
                <td>
                    <div className="mhwc-icons_bundle">
                        <FunctionalIcon
                            iconName={isIgnore ? 'star-o' : 'star'}
                            altName={isIgnore ? _('include') : _('exclude')}
                            onClick={() => {this.handleItemToggle(data.type, data.id)}} />

                        {(this.state.data.equipId !== data.id) ? (
                            <FunctionalIcon
                                iconName="check" altName={_('select')}
                                onClick={() => {this.handleItemPickUp(data.id)}} />
                        ) : false}
                    </div>
                </td>
            </tr>
        );
    };

    renderArmorTable = () => {
        let segment = this.state.segment;

        return (
            <table className="mhwc-armor_table">
                <thead>
                    <tr>
                        <td>{_('name')}</td>
                        <td>{_('series')}</td>
                        <td>{_('rare')}</td>
                        <td>{_('defense')}</td>
                        <td>{_('resistance')}</td>
                        <td>{_('slot')}</td>
                        <td>{_('set')}</td>
                        <td>{_('skill')}</td>
                        <td></td>
                    </tr>
                </thead>
                <tbody>
                    {this.state.includeList.map((data, index) => {

                        if (data.rare !== this.state.rare) {
                            return;
                        }

                        // Create Text
                        let text = _(data.name);
                        text += _(data.series);

                        if (Helper.isNotEmpty(data.set)) {
                            let setInfo = SetDataset.getInfo(data.set.id);

                            if (Helper.isNotEmpty(setInfo)) {
                                text += _(setInfo.name);
                            }
                        }

                        data.skills.forEach((data) => {
                            let skillInfo = SkillDataset.getInfo(data.id);

                            if (Helper.isNotEmpty(skillInfo)) {
                                text += _(skillInfo.name);
                            }
                        });

                        // Search Nameword
                        if (Helper.isNotEmpty(segment)
                            && -1 === text.toLowerCase().search(segment.toLowerCase())
                        ) {
                            return false;
                        }

                        return this.renderArmorRow(data, index, false);
                    })}

                    {this.state.ignoreList.map((data, index) => {
                        return this.renderArmorRow(data, index, true);
                    })}
                </tbody>
            </table>
        );
    };

    renderCharmRow = (data, index, isIgnore) => {
        return (
            <tr key={data.id}>
                <td><span>{_(data.name)}</span></td>
                <td><span>{data.rare}</span></td>
                <td>
                    {data.skills.map((data, index) => {
                        let skillInfo = SkillDataset.getInfo(data.id);

                        return (Helper.isNotEmpty(skillInfo)) ? (
                            <div key={index}>
                                <span>{_(skillInfo.name)} Lv.{data.level}</span>
                            </div>
                        ) : false;
                    })}
                </td>
                <td>
                    <div className="mhwc-icons_bundle">
                        <FunctionalIcon
                            iconName={isIgnore ? 'star-o' : 'star'}
                            altName={isIgnore ? _('include') : _('exclude')}
                            onClick={() => {this.handleItemToggle('charm', data.id)}} />

                        {(this.state.data.equipId !== data.id) ? (
                            <FunctionalIcon
                                iconName="check" altName={_('select')}
                                onClick={() => {this.handleItemPickUp(data.id)}} />
                        ) : false}
                    </div>
                </td>
            </tr>
        );
    };

    renderCharmTable = () => {
        let segment = this.state.segment;

        return (
            <table className="mhwc-charm_table">
                <thead>
                    <tr>
                        <td>{_('name')}</td>
                        <td>{_('rare')}</td>
                        <td>{_('skill')}</td>
                        <td></td>
                    </tr>
                </thead>
                <tbody>
                    {this.state.includeList.map((data, index) => {

                        // Create Text
                        let text = _(data.name);

                        data.skills.forEach((data) => {
                            let skillInfo = SkillDataset.getInfo(data.id);

                            if (Helper.isNotEmpty(skillInfo)) {
                                text += _(skillInfo.anem);
                            }
                        });

                        // Search Nameword
                        if (Helper.isNotEmpty(segment)
                            && -1 === text.toLowerCase().search(segment.toLowerCase())
                        ) {
                            return false;
                        }

                        return this.renderCharmRow(data, index, false);
                    })}

                    {this.state.ignoreList.map((data, index) => {
                        return this.renderCharmRow(data, index, true);
                    })}
                </tbody>
            </table>
        );
    };

    renderJewelRow = (data, index) => {
        let skillInfo = SkillDataset.getInfo(data.skill.id);

        return (
            <tr key={data.id}>
                <td><span>{_(data.name)}</span></td>
                <td><span>{data.rare}</span></td>
                <td><span>{data.size}</span></td>
                <td>
                    {(Helper.isNotEmpty(skillInfo)) ? (
                        <span>{_(skillInfo.name)} Lv.{data.skill.level}</span>
                    ) : false}
                </td>
                <td>
                    <div className="mhwc-icons_bundle">
                        {(this.state.data.jewelId !== data.id) ? (
                            <FunctionalIcon
                                iconName="check" altName={_('select')}
                                onClick={() => {this.handleItemPickUp(data.id)}} />
                        ) : false}
                    </div>
                </td>
            </tr>
        );
    };

    renderJewelTable = () => {
        let segment = this.state.segment;

        return (
            <table className="mhwc-jewel_table">
                <thead>
                    <tr>
                        <td>{_('name')}</td>
                        <td>{_('rare')}</td>
                        <td>{_('size')}</td>
                        <td>{_('skill')}</td>
                        <td></td>
                    </tr>
                </thead>
                <tbody>
                    {this.state.includeList.map((data, index) => {

                        // Create Text
                        let text = _(data.name);

                        let skillInfo = SkillDataset.getInfo(data.skill.id);

                        if (Helper.isNotEmpty(skillInfo)) {
                            text += _(skillInfo.name);
                        }

                        // Search Nameword
                        if (Helper.isNotEmpty(segment)
                            && -1 === text.toLowerCase().search(segment.toLowerCase())
                        ) {
                            return false;
                        }

                        return this.renderJewelRow(data, index);
                    })}
                </tbody>
            </table>
        );
    };

    renderEnhanceRow = (data, index) => {
        return (
            <tr key={data.id}>
                <td>{_(data.name)}</td>
                <td>
                    {data.list.map((data, index) => {
                        return (
                            <div key={index}>
                                <span>Lv.{data.level}</span>
                            </div>
                        );
                    })}
                </td>
                <td>
                    {data.list.map((data, index) => {
                        return (
                            <div key={index}>
                                <span>{_(data.description)}</span>
                            </div>
                        );
                    })}
                </td>
                <td>
                    <div className="mhwc-icons_bundle">
                        {(this.state.data.enhanceId !== data.id) ? (
                            <FunctionalIcon
                                iconName="check" altName={_('select')}
                                onClick={() => {this.handleItemPickUp(data.id)}} />
                        ) : false}
                    </div>
                </td>
            </tr>
        );
    };

    renderEnhanceTable = () => {
        let segment = this.state.segment;

        return (
            <table className="mhwc-enhance_table">
                <thead>
                    <tr>
                        <td>{_('name')}</td>
                        <td>{_('level')}</td>
                        <td>{_('description')}</td>
                        <td></td>
                    </tr>
                </thead>
                <tbody>
                    {this.state.includeList.map((data, index) => {

                        // Create Text
                        let text = _(data.name);

                        data.list.forEach((data) => {
                            text += _(data.description);
                        });

                        // Search Nameword
                        if (Helper.isNotEmpty(segment)
                            && -1 === text.toLowerCase().search(segment.toLowerCase())
                        ) {
                            return false;
                        }

                        return this.renderEnhanceRow(data, index);
                    })}
                </tbody>
            </table>
        );
    };

    render () {
        let Content = null;

        if (Helper.isEmpty(this.state.data)) {
            return false;
        }

        switch (this.state.mode) {
        case 'weapon':
            Content = this.renderWeaponTable();
            break;
        case 'armor':
            Content = this.renderArmorTable();
            break;
        case 'charm':
            Content = this.renderCharmTable();
            break;
        case 'jewel':
            Content = this.renderJewelTable();
            break;
        case 'enhance':
            Content = this.renderEnhanceTable();
            break;
        }

        return this.state.isShow ? (
            <div className="mhwc-selector" ref="modal" onClick={this.handleFastWindowClose}>
                <div className="mhwc-modal">
                    <div className="mhwc-panel">
                        <input className="mhwc-text_segment" type="text"
                            placeholder={_('inputKeyword')}
                            ref="segment" onChange={this.handleSegmentInput} />

                        {('weapon' === this.state.mode) ? (
                            <select defaultValue={this.state.type} ref="type" onChange={this.handleTypeChange}>
                                {Constant.weaponTypes.map((type) => {
                                    return (
                                        <option key={type} value={type}>{_(type)}</option>
                                    );
                                })}
                            </select>
                        ) : false}

                        {('weapon' === this.state.mode || 'armor' === this.state.mode) ? (
                            <select defaultValue={this.state.rare} ref="rare" onChange={this.handleRareChange}>
                                {[8, 7, 6, 5].map((rare) => {
                                    return (
                                        <option key={rare} value={rare}>{_('rare') + `: ${rare}`}</option>
                                    );
                                })}
                            </select>
                        ) : false}

                        <div className="mhwc-icons_bundle">
                            <FunctionalIcon
                                iconName="times" altName={_('close')}
                                onClick={this.handleWindowClose} />
                        </div>
                    </div>
                    <div className="mhwc-list">
                        {Content}
                    </div>
                </div>
            </div>
        ) : false;
    }
}