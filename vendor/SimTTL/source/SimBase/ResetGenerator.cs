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
    /// A reset generator class.
    /// </summary>
    public class ResetGenerator : BaseElement
    {
        /// <summary>
        /// Definition of the delegate for the end of the reset phase.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        public delegate void ResetEndHandler(object sender, EventArgs e);

        /// <summary>Event to notify the special handler.</summary>
        public ResetEndHandler ResetEndEvent;

        /// <summary>Time to hold reset active.</summary>
        protected double resetTime;

        /// <summary>Output pin for the reset.</summary>
        public Pin Out;
        /// <summary>Inverted output pin for the reset.</summary>
        public Pin Outn;

        /// <summary>
        /// Creates the ResetGenerator instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        /// <param name="ResetTime">Time to hold reset active.</param>
        public ResetGenerator(string Name, double ResetTime) : base(Name)
        {
            Power = new Pin[0];
            Ground = new Pin[0];
            Passive = new Pin[0];

            this.Out = new Pin(this, "Out", "1", LineMode.Out, SignalState.H, 0);
            this.Outn = new Pin(this, "Outn", "2", LineMode.Out, SignalState.L, 0);
            this.resetTime = ResetTime;
            Outputs = new Pin[2][];
            SetPinArray(Outputs, 0, Out);
            SetPinArray(Outputs, 1, Outn);
            SimulationRestart();
        }

        /// <summary>
        /// Restart the simulation to all pins.
        /// </summary>
        public override void SimulationRestart()
        {
            base.SimulationRestart();
            Out.SetOutState(SignalState.H);
            Outn.SetOutState(SignalState.L);
        }

        /// <summary>
        /// Update outputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            if (Time >= resetTime)
            {
                if (Out.NewOutState != SignalState.L)
                {
                    if (ResetEndEvent != null)
                        ResetEndEvent(null, null);
                }
                Out.NewOutState = SignalState.L;
                Outn.NewOutState = SignalState.H;
            }
            Out.UpdateOutput(Time);
            Outn.UpdateOutput(Time);
        }

        /// <summary>Time to hold reset active.</summary>
        public double ResetTime
        {
            get { return this.resetTime; }
        }


    }

}
