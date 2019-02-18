'use strict';
/**
 * Skill Item Selector
 *
 * @package     MHW Calculator
 * @author      Scar Wu
 * @copyright   Copyright (c) Scar Wu (http://scar.tw)
 * @link        https://github.com/scarwu/MHWCalculator
 */

// Load Libraries
import React, { Component } from 'react';

// Load Core Libraries
import Event from 'core/event';
import Helper from 'core/helper';

// Load Custom Libraries
import DataSet from 'libraries/dataset';
import Lang from 'libraries/lang';

// Load Components
import FunctionalIcon from 'components/common/functionalIcon';

// Load Constant
import Constant from 'constant';

export default class SkillItemSelector extends Component {

    // Default Props
    static defaultProps = {
        data: {},
        onPickUp: (data) => {},
        onThrowDown: (data) => {},
        onClose: () => {}
    };

    // Initial State
    state = {
        data: {},
        list: [],
        segment: null
    };

    /**
     * Handle Functions
     */
    handleWindowClose = () => {
        this.props.onClose();
    };

    handleItemPickUp = (itemName) => {
        this.props.onPickUp({
            skillName: itemName
        });
    };

    handleItemThrowDown = (itemName) => {
        this.props.onThrowDown({
            skillName: itemName
        });
    };

    handleSegmentInput = () => {
        let segment = this.refs.segment.value;

        segment = (0 !== segment.length) ? segment.trim() : null;

        this.setState({
            segment: segment
        });
    };

    initList = (data) => {
        let selectedList = [];
        let unselectedList = [];

        data = data.map((skill) => {
            return skill.id;
        });

        DataSet.skillHelper.getNames().sort().forEach((skillName) => {

            let skill = DataSet.skillHelper.getInfo(skillName);

            if (false === skill.from.jewel && false === skill.from.armor) {
                return;
            }

            // Skip Selected Skills
            if (-1 !== data.indexOf(skill.id)) {
                selectedList.push(skill);
            } else {
                unselectedList.push(skill);
            }
        });

        this.setState({
            selectedList: selectedList,
            unselectedList: unselectedList
        });
    };

    /**
     * Lifecycle Functions
     */
    componentWillMount () {
        this.initList(this.props.data);
    }

    componentWillReceiveProps (nextProps) {
        this.initList(nextProps.data);
    }

    /**
     * Render Functions
     */
    renderRow = (data, isSelect) => {
        return (
            <tr key={data.id}>
                <td><span>{data.name}</span></td>
                <td>
                    {data.list.map((skill, index) => {
                        return (
                            <div key={index}>
                                <span>Lv.{skill.level}</span>
                            </div>
                        );
                    })}
                </td>
                <td>
                    {data.list.map((skill, index) => {
                        return (
                            <div key={index}>
                                <span>{skill.description}</span>
                            </div>
                        );
                    })}
                </td>
                <td>
                    <div className="mhwc-icons_bundle">
                        {isSelect ? (
                            <FunctionalIcon
                                iconName="minus" altName={Lang.remove}
                                onClick={() => {this.handleItemThrowDown(data.id)}} />
                        ) : (
                            <FunctionalIcon
                                iconName="plus" altName={Lang.add}
                                onClick={() => {this.handleItemPickUp(data.id)}} />
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    renderTable = () => {
        let segment = this.state.segment;

        return (
            <table className="mhwc-skill_table">
                <thead>
                    <tr>
                        <td>{Lang.name}</td>
                        <td>{Lang.level}</td>
                        <td>{Lang.description}</td>
                        <td></td>
                    </tr>
                </thead>
                <tbody>
                    {this.state.selectedList.map((data, index) => {

                        // Create Text
                        let text = data.id;

                        data.list.forEach((data) => {
                            text += data.id + data.description;
                        })

                        // Search Nameword
                        if (null !== segment
                            && !text.toLowerCase().match(segment.toLowerCase())) {

                            return false;
                        }

                        return this.renderRow(data, true);
                    })}

                    {this.state.unselectedList.map((data, index) => {

                        // Create Text
                        let text = data.id;

                        data.list.forEach((data) => {
                            text += data.id + data.description;
                        })

                        // Search Nameword
                        if (null !== segment
                            && !text.toLowerCase().match(segment.toLowerCase())) {

                            return false;
                        }

                        return this.renderRow(data, false);
                    })}
                </tbody>
            </table>
        );
    };

    render () {
        return (
            <div className="mhwc-selector">
                <div className="mhwc-dialog">
                    <div className="mhwc-panel">
                        <input className="mhwc-text_segment" type="text"
                            ref="segment" onChange={this.handleSegmentInput} />

                        <div className="mhwc-icons_bundle">
                            <FunctionalIcon
                                iconName="times" altName={Lang.close}
                                onClick={this.handleWindowClose} />
                        </div>
                    </div>
                    <div className="mhwc-list">
                        {this.renderTable()}
                    </div>
                </div>
            </div>
        );
    }
}
