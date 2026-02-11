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
    public class Stimulus:BaseElement
    {
        /// <summary>Condition string representation of the CompareCondition enumeration.</summary>
        public static string[] OutStr = { "Standard", "TriState", "OpenDrain" };

        /// <summary>
        /// Enumeration of possible output conditions.
        /// </summary>
        public enum OutputType
        {
            Standard,
            TriState,
            OpenDrain
        }

        /// <summary>Name of the signal to check.</summary>
        public string SignalName;
        /// <summary>Output type of the pulse generator.</summary>
        public OutputType Output;

        /// <summary>A value to be injected.</summary>
        public UInt64 Value;
        /// <summary>String representation of the Value.</summary>
        public string ValueStr;

        /// <summary>A time for the pulse activation.</summary>
        public double Time;
        /// <summary>String representation of the time.</summary>
        public string TimeStr;

        /// <summary>A duration of the pulse.</summary>
        public double Duration;
        /// <summary>String representation of the duration.</summary>
        public string DurationStr;
        /// <summary>Array of output pins to stimulate.</summary>
        public Pin[] Pins;

        /// <summary>State of all pins when not activated.</summary>
        private SignalState InactiveState;

        /// <summary>Enumeration to define the sequential states.</summary>
        private enum StimulusState
        {
            Initial,
            Activated,
            Done
        }

        /// <summary>Current state in the activation sequence.</summary>
        private StimulusState State;

        /// <summary>
        /// Creates the instance of the Trigger class.
        /// </summary>
        /// <param name="SignalName">Name of the signal to check.</param>
        /// <param name="Bits">Number of bits to stimulate.</param>
        /// <param name="Output">Output type of the pulse generator.</param>
        /// <param name="Value">A value to be injected.</param>
        /// <param name="ValueStr">String representation of the value.</param>
        /// <param name="Time">A time for the pulse activation.</param>
        /// <param name="TimeStr">String representation of the time.</param>
        /// <param name="Duration">A duration of the pulse.</param>
        /// <param name="DurationStr">String representation of the duration.</param>
        public Stimulus(string SignalName, int Bits, byte Output, UInt64 Value, string ValueStr, double Time, string TimeStr, double Duration, string DurationStr) : this(SignalName, Bits, (OutputType)Output, Value, ValueStr, Time, TimeStr, Duration, DurationStr) { }


        /// <summary>
        /// Creates the instance of the Trigger class.
        /// </summary>
        /// <param name="SignalName">Name of the signal to check.</param>
        /// <param name="Bits">Number of bits to stimulate.</param>
        /// <param name="Output">Output type of the pulse generator.</param>
        /// <param name="Value">A value to be injected.</param>
        /// <param name="ValueStr">String representation of the value.</param>
        /// <param name="Time">A time for the pulse activation.</param>
        /// <param name="TimeStr">String representation of the time.</param>
        /// <param name="Duration">A duration of the pulse.</param>
        /// <param name="DurationStr">String representation of the duration.</param>
        public Stimulus(string SignalName, int Bits, OutputType Output, UInt64 Value, string ValueStr, double Time, string TimeStr, double Duration, string DurationStr):base("Stimulus")
        {
            this.SignalName = SignalName;
            this.Output = Output;
            this.Value = Value;
            this.ValueStr = ValueStr;
            this.Time = Time;
            this.TimeStr = TimeStr;
            this.Duration = Duration;
            this.DurationStr = DurationStr;

            LineMode lineMode = LineMode.Out;
            InactiveState = SignalState.L;
            if (Output == OutputType.TriState)
            {
                lineMode = LineMode.BiDir;
                InactiveState = SignalState.Z;
            }
            else if (Output == OutputType.OpenDrain)
            {
                lineMode = LineMode.OpenDrain;
                InactiveState = SignalState.H;
            }
            this.Pins = new Pin[Bits];
            for (int i=0; i< Bits; i++)
                this.Pins[i] = new Pin(this, SignalName, i.ToString(), lineMode, InactiveState, 0);

            Power = new Pin[0];
            Ground = new Pin[0];
            Passive = new Pin[0];
            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, this.Pins);

            SimulationRestart();
        }


        #region Public Methods


        /// <summary>
        /// Restart the simulation to all pins.
        /// </summary>
        public override void SimulationRestart()
        {
            base.SimulationRestart();
            State = StimulusState.Initial;
        }

        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            switch (State)
            {
                case StimulusState.Initial:
                    if (Time >= this.Time)
                    {
                        for (int i = 0; i < Pins.Length; i++)
                        {
                            if ((Value & ((UInt64)1 << i)) == 0)
                                Pins[i].SetOutState(SignalState.L);
                            else
                                Pins[i].SetOutState(SignalState.H);
                        }
                        State = StimulusState.Activated;
                    }
                    break;

                case StimulusState.Activated:
                    if (Time >= this.Time + Duration)
                    {
                        for (int i = 0; i < Pins.Length; i++)
                            Pins[i].SetOutState(InactiveState);
                        State = StimulusState.Done;
                    }
                    break;

                default:
                    break;

            }
            base.Update(Time);
        }

        /// <summary>
        /// Create a copy of this object.
        /// </summary>
        /// <returns>Copy of this object.</returns>
        public Stimulus CreateCopy()
        {
            return new Stimulus(SignalName, Pins.Length, Output, Value, ValueStr, Time, TimeStr, Duration, DurationStr);
        }


        /// <summary>
        /// Create a copy of the list with element copies.
        /// </summary>
        /// <param name="StimulusList">List to copy.</param>
        /// <returns>Copy of the list</returns>
        public static List<Stimulus> CreateListCopy(List<Stimulus> StimulusList)
        {
            List<Stimulus> Copy = new List<Stimulus>();
            foreach (Stimulus stimulus in StimulusList)
                Copy.Add(stimulus.CreateCopy());
            return Copy;
        }
        #endregion Public Methods
    }
}
