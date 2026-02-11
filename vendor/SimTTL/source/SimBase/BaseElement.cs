// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Reflection;

namespace SimBase
{
    /// <summary>
    /// A base class to define generic schematics element.
    /// </summary>
    public class BaseElement
    {

        /// <summary>Name of this element.</summary>
        public string Name;
        /// <summary>Arrays of input pins.</summary>
        public Pin[][] Inputs;
        /// <summary>Arrays of output pins.</summary>
        public Pin[][] Outputs;
        /// <summary>Array of power pins.</summary>
        public Pin[] Power;
        /// <summary>Array of ground pins.</summary>
        public Pin[] Ground;
        /// <summary>Array of passive pins.</summary>
        public Pin[] Passive;

        /// <summary>
        /// Creates the BaeElement.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        public BaseElement(string Name)
        {
            this.Name = Name;
            this.Inputs = new Pin[0][];
            this.Outputs = new Pin[0][];
            this.Power = new Pin[1];
            this.Ground = new Pin[1];
            this.Passive = new Pin[0];
        }


        /// <summary>
        /// Assigns one pin object to a specific index of the array.
        /// </summary>
        /// <param name="PinArray">Pin arrays to be assigned to.</param>
        /// <param name="Idx">First dimension index to assign to.</param>
        /// <param name="PinObj">Reference to the pin object to assign to the array.</param>
        protected void SetPinArray(Pin[][] PinArray, int Idx, Pin PinObj)
        {
            PinArray[Idx] = new Pin[1];
            PinArray[Idx][0] = PinObj;
        }

        /// <summary>
        /// Assigns a one dimensional pin array to a specific index of the array.
        /// </summary>
        /// <param name="PinArray">Pin arrays to be assigned to.</param>
        /// <param name="Idx">First dimension index to assign to.</param>
        /// <param name="PinObjs">Reference to the pin object array to assign to the pin array.</param>
        protected void SetPinArray(Pin[][] PinArray, int Idx, Pin[] PinObjs)
        {
            PinArray[Idx] = new Pin[PinObjs.Length];
            for (int i=0; i< PinObjs.Length; i++)
                PinArray[Idx][i] = PinObjs[i];
        }

        /// <summary>
        /// Update all inputs to the time value.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        protected virtual void UpdateInputs(double Time)
        {
            for (int i = 0; i < Inputs.Length; i++)
                for (int j = 0; j < Inputs[i].Length; j++)
                    Inputs[i][j].UpdateInput(Time);
        }

        /// <summary>
        /// Update all outputs to the time value.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        protected virtual void UpdateOutputs(double Time)
        {
            for (int i = 0; i < Outputs.Length; i++)
                for (int j = 0; j < Outputs[i].Length; j++)
                    Outputs[i][j].UpdateOutput(Time);
        }

        /// <summary>
        /// Set all output pins from Idx1 to Idx2 to the requested state.
        /// </summary>
        /// <param name="Idx1">Starting outer index.</param>
        /// <param name="Idx2">Ending outer index.</param>
        /// <param name="State">State to set to.</param>
        /// <exception cref="Exception">An exception is thrown when indices are out of range. </exception>
        protected virtual void SetOutputStates(int Idx1, int Idx2, SignalState State)
        {
            if ((Idx1 < 0) || (Idx2 >= Outputs.Length) || (Idx1 > Idx2))
                throw new Exception("SetOutputStates indices out of range! \n\r Idx1=" + Idx1.ToString() + "  Idx2=" + Idx2.ToString() + "  Length=" + Outputs.Length.ToString());

            for (int i = Idx1; i <= Idx2; i++)
                for (int j = 0; j < Outputs[i].Length; j++)
                    Outputs[i][j].SetOutState(State);
        }

        /// <summary>
        /// Set all output pins of the outer index to the requested state.
        /// </summary>
        /// <param name="Idx">First dimension index to assign to.</param>
        /// <param name="State">State to set to.</param>
        protected virtual void SetNewOutputStates(int Idx, SignalState State)
        {
            for (int j = 0; j < Outputs[Idx].Length; j++)
                Outputs[Idx][j].NewOutState = State;
        }

        /// <summary>
        /// Set all output pins of the outer index to the requested state and set the output change time to the requested time.
        /// </summary>
        /// <param name="Idx">First dimension index to assign to.</param>
        /// <param name="State">State to set to.</param>
        /// <param name="ChangeTime">Time value to set the change time too</param>
        protected virtual void SetNewOutputStates(int Idx, SignalState State, double ChangeTime)
        {
            for (int j = 0; j < Outputs[Idx].Length; j++)
            {
                Outputs[Idx][j].NewOutState = State;
                Outputs[Idx][j].SetOutputChangeTime(ChangeTime);
            }
        }

        /// <summary>
        /// Set all output pins to the requested state.
        /// </summary>
        /// <param name="State">State to set to.</param>
        protected virtual void SetOutputStates(SignalState State)
        {
            for (int i = 0; i < Outputs.Length; i++)
                for (int j = 0; j < Outputs[i].Length; j++)
                    Outputs[i][j].SetOutState(State);
        }

        /// <summary>
        /// Set all output change times of the outer index to the requested value.
        /// </summary>
        /// <param name="Idx">First dimension index to assign to.</param>
        /// <param name="ChangeTime">Time value to set the change time too</param>
        protected virtual void SetOutputChangeTime(int Idx, double ChangeTime)
        {
            for (int j = 0; j < Outputs[Idx].Length; j++)
                Outputs[Idx][j].SetOutputChangeTime(ChangeTime);
        }

        /// <summary>
        /// Set all output change times to the requested value.
        /// </summary>
        /// <param name="ChangeTime">Time value to set the change time too</param>
        protected virtual void SetOutputChangeTime(double ChangeTime)
        {
            for (int i = 0; i < Outputs.Length; i++)
                SetOutputChangeTime(i, ChangeTime);
        }

        /// <summary>
        /// Get an integer value representation of a pin group as a bus.
        /// </summary>
        /// <param name="Pins">Pin array to convert from.</param>
        /// <returns>Integer value representing the bus.</returns>
        protected int GetValue(Pin[] Pins)
        {
            int result = 0;
            for (int i = 0; i < Pins.Length; i++)
            {
                if (Pins[i].State == SignalState.L)
                { }
                else if (Pins[i].State == SignalState.H)
                    result |= 1 << i;
                else
                    return -1;
            }
            return result;
        }

        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public virtual void Update(double Time)
        {
            UpdateOutputs(Time);
            UpdateInputs(Time);
        }

        /// <summary>
        /// Restart the simulation to all pins.
        /// </summary>
        public virtual void SimulationRestart()
        {
            for (int i = 0; i < Power.Length; i++)
                if (Power[i] != null)
                    Power[i].SimulationRestart();

            for (int i = 0; i < Ground.Length; i++)
                if (Ground[i] != null)
                    Ground[i].SimulationRestart();

            for (int i = 0; i < Passive.Length; i++)
                if (Passive[i] != null)
                    Passive[i].SimulationRestart();

            for (int i = 0; i < Inputs.Length; i++)
                for (int j = 0; j < Inputs[i].Length; j++)
                    if (Inputs[i][j] != null)
                        Inputs[i][j].SimulationRestart();

            for (int i = 0; i < Outputs.Length; i++)
                for (int j = 0; j < Outputs[i].Length; j++)
                    if (Outputs[i][j] != null)
                        Outputs[i][j].SimulationRestart();

        }

        /// <summary>
        /// Find the pin with a matching pin number and return the reference.
        /// </summary>
        /// <param name="PinNo">Pin number or pin name.</param>
        /// <returns>Reference to the found pin or null if not found.</returns>
        public Pin GetPin(string PinNo)
        {
            for (int i = 0; i < Inputs.Length; i++)
                foreach (Pin pin in Inputs[i])
                    if (pin.PinNo == PinNo)
                        return pin;

            for (int i = 0; i < Outputs.Length; i++)
                foreach (Pin pin in Outputs[i])
                    if (pin.PinNo == PinNo)
                        return pin;

            foreach (Pin pin in Power)
                if (pin.PinNo == PinNo)
                    return pin;

            foreach (Pin pin in Ground)
                if (pin.PinNo == PinNo)
                    return pin;

            foreach (Pin pin in Passive)
                if (pin.PinNo == PinNo)
                    return pin;

            return null;
        }
    }
}
