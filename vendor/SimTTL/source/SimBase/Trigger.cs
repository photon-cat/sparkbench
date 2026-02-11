// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using SimBase;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SimBase
{
    /// <summary>
    /// A class representing atrigger condition.
    /// </summary>
    public class Trigger
    {
        /// <summary>Condition string representation of the CompareCondition enumeration.</summary>
        public static string[] CondStr = { "X", "==", "!=", ">", "<", ">=", "<=", "R", "F" };
        /// <summary>Logic string representation of the LogicOp enumeration.</summary>
        public static string[] LogicStr = { "AND", "OR" };

        /// <summary>
        /// Enumeration of possible compare conditions.
        /// </summary>
        public enum CompareCondition
        {
            X,
            EQ,
            NE,
            GT,
            LT,
            GE,
            LE,
            R,
            F
        }

        /// <summary>
        /// Enumeration of possible logic operations.
        /// </summary>
        public enum LogicOp
        {
            AND,
            OR
        }

        /// <summary>Name of the signal to check.</summary>
        public string SignalName;
        /// <summary>Number of bits.</summary>
        public int Bits;
        /// <summary>Compare condition to check.</summary>
        public CompareCondition Condition;
        /// <summary>A value for the comparison.</summary>
        public UInt64 CompareValue;
        /// <summary>String representation of the Value.</summary>
        public string CompareValueStr;
        /// <summary>Logic operation to the next trigger.</summary>
        public LogicOp Logic;
        /// <summary>Reference to the linked schematics element.</summary>
        public BaseElement Element;
        /// <summary>Array of pins to be assigned.</summary>
        public Pin[] Pins;

        /// <summary>The current value represented by the state of the pins if valid.</summary>
        private UInt64 currentValue;
        /// <summary>Holds the valid state of the current value conversion.</summary>
        private bool currentValueValid;
        /// <summary>True, if the trigger condition is met.</summary>
        private bool conditionMet;

        /// <summary>
        /// Creates the instance of the Trigger class.
        /// </summary>
        /// <param name="SignalName">Name of the signal to check.</param>
        /// <param name="Bits">Number of bits.</param>
        /// <param name="Condition">Compare condition to check.</param>
        /// <param name="Value">A value for the comparison.</param>
        /// <param name="ValueStr">String representation of the Value.</param>
        /// <param name="Logic">Logic operation to the next trigger.</param>
        public Trigger(string SignalName, int Bits, CompareCondition Condition, UInt64 CompareValue, string CompareValueStr, LogicOp Logic) : this(SignalName, Bits, Condition, CompareValue, CompareValueStr, Logic, null, null) { }

        /// <summary>
        /// Creates the instance of the Trigger class.
        /// </summary>
        /// <param name="SignalName">Name of the signal to check.</param>
        /// <param name="Bits">Number of bits.</param>
        /// <param name="Condition">Compare condition to check.</param>
        /// <param name="Value">A value for the comparison.</param>
        /// <param name="ValueStr">String representation of the Value.</param>
        /// <param name="Logic">Logic operation to the next trigger.</param>
        /// <param name="Element">Reference to the schematics element.</param>
        /// <param name="Pin">Array of pins to be assigned.</param>
        public Trigger(string SignalName, int Bits, CompareCondition Condition, UInt64 CompareValue, string CompareValueStr, LogicOp Logic, BaseElement Element, Pin[] Pins)
        {
            this.SignalName = SignalName;
            this.Bits = Bits;
            this.Condition = Condition;
            this.CompareValue = CompareValue;
            this.CompareValueStr = CompareValueStr;
            this.Logic = Logic;
            this.Element = Element;
            this.Pins = Pins;
        }

        /// <summary>
        /// Create a copy of this object.
        /// </summary>
        /// <returns>Copy of this object.</returns>
        public Trigger CreateCopy()
        {
            return new Trigger(SignalName, Bits, Condition, CompareValue, CompareValueStr, Logic);
        }

        /// <summary>
        /// Create a copy of the list with element copies.
        /// </summary>
        /// <param name="TriggerList">List to copy.</param>
        /// <returns>Copy of the list</returns>
        public static List<Trigger> CreateListCopy(List<Trigger> TriggerList)
        {
            List<Trigger> Copy = new List<Trigger>();
            foreach (Trigger trigger in TriggerList) 
                Copy.Add(trigger.CreateCopy());
            return Copy;
        }


        /// <summary>
        /// Determines the current value from the state of the Pins.
        /// </summary>
        /// <returns>True, if the conversion resulted in a valid value.</returns>
        public bool GetCurrentValue()
        {
            if ((Element != null) && (Pins != null) && (Pins.Length > 0))
            {
                bool valid = true;
                UInt64 value = 0;
                if (Pins.Length == 1)
                {
                    if ((Pins[0].State == SignalState.U) || (Pins[0].State == SignalState.Z))
                        valid = false;
                    else if (Pins[0].State == SignalState.H)
                        value = 1;
                }
                else
                    for (int i = 0; i < Pins.Length; i++)
                    {
                        if ((Pins[i].State == SignalState.U) || (Pins[i].State == SignalState.Z))
                        {
                            valid = false;
                            break;
                        }
                        else if (Pins[i].State == SignalState.H)
                            value |= (UInt64)1 << i;
                    }

                currentValueValid = valid;
                currentValue = value;
            }
            else
            {
                currentValueValid = false;
                currentValue = 0;
            }
            return currentValueValid;
        }

        /// <summary>
        /// Determine the value of the states of the pins and check the conditions.
        /// </summary>
        /// <returns>True, if the condition is met.</returns>
        public bool CheckConditions()
        {
            conditionMet = false;
            switch (Condition)
            {
                case CompareCondition.X:
                    conditionMet = true;
                    break;

                case CompareCondition.EQ:
                    if (GetCurrentValue())
                        conditionMet = currentValue == CompareValue;
                    break;

                case CompareCondition.NE:
                    if (GetCurrentValue())
                        conditionMet = currentValue != CompareValue;
                    break;

                case CompareCondition.GT:
                    if (GetCurrentValue())
                        conditionMet = currentValue > CompareValue;
                    break;

                case CompareCondition.LT:
                    if (GetCurrentValue())
                        conditionMet = currentValue < CompareValue;
                    break;

                case CompareCondition.GE:
                    if (GetCurrentValue())
                        conditionMet = currentValue >= CompareValue;
                    break;

                case CompareCondition.LE:
                    if (GetCurrentValue())
                        conditionMet = currentValue <= CompareValue;
                    break;

                case CompareCondition.R:
                    {
                        bool lastValid = currentValueValid;
                        UInt64 lastValue = currentValue;
                        if (GetCurrentValue() && lastValid)
                                conditionMet = currentValue > lastValue;                            
                    }
                    break;

                case CompareCondition.F:
                    {
                        bool lastValid = currentValueValid;
                        UInt64 lastValue = currentValue;
                        if (GetCurrentValue() && lastValid)
                            conditionMet = currentValue < lastValue;
                    }
                    break;
            }
            return conditionMet;
        }

        /// <summary>
        /// Gets the current value represented by the state of the pins if valid.
        /// </summary>
        public UInt64 CurrentValue
        {
            get { return currentValue; }
        }

        /// <summary>
        /// Gets the valid state of the current value conversion.
        /// </summary>
        public bool CurrentValueValid
        { 
            get { return currentValueValid; } 
        }

        /// <summary>
        /// Returns true, if the trigger condition is met.
        /// </summary>
        public bool ConditionMet
        {
            get { return conditionMet; }
        }

    }
}
