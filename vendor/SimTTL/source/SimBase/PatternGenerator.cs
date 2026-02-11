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

namespace SimBase
{
    /// <summary>
    /// Class to store individual patterns for a time.
    /// </summary>
    public struct PatternEntry
    {
        /// <summary>Time value in ns.</summary>
        public double Time;
        /// <summary>Array of states for that time.</summary>
        public SignalState[] States;

        /// <summary>
        /// Creates the instance.
        /// </summary>
        /// <param name="Time">Time value in ns.</param>
        /// <param name="States">Array of states for that time.</param>
        public PatternEntry(double Time, SignalState[] States)
        {
            this.Time = Time;
            this.States = States;
        }
    }

    /// <summary>
    /// An element to generate efinied patterns for testing.
    /// </summary>
    public class PatternGenerator:BaseElement
    {
        /// <summary>Array of output pins.</summary>
        public Pin[] Out;
        /// <summary>List of patterns.</summary>
        public readonly List<PatternEntry> Patterns;
        /// <summary>Current pattern index.</summary>
        protected int patternIdx;

        /// <summary>
        /// Creates the PatternGenerator instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        /// <param name="Nout">Number of output pins.</param>
        /// <param name="Pattern">Array of patterns</param>
        public PatternGenerator(string Name, int Nout, PatternEntry[] Pattern) : base(Name)
        {
            Power = new Pin[0];
            Ground = new Pin[0];
            Passive = new Pin[0];

            this.Out = new Pin[Nout];
            for (int i=0; i< Nout; i++)
                Out[i] = new Pin(this, "Out"+i.ToString(), i.ToString(), LineMode.Out, SignalState.L, 0);

            Patterns = new List<PatternEntry>();
            if (Pattern != null)
                Patterns.AddRange(Pattern);

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, Out);
            SimulationRestart();
        }

        /// <summary>
        /// Restart the simulation to all pins.
        /// </summary>
        public override void SimulationRestart()
        {
            base.SimulationRestart();
            patternIdx = 0;
            SetOutputStates(SignalState.L);
        }

        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            if ((patternIdx < Patterns.Count) && (Time >= Patterns[patternIdx].Time))
            {
                for (int i = 0; i < Out.Length; i++)
                    Out[i].NewOutState = Patterns[patternIdx].States[i];
                UpdateOutputs(Time);
                patternIdx++;
            }
        }

    }
}
