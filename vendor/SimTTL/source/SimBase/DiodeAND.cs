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
    /// A class representing a combination of diodes and pull-up to create an AND function.
    /// </summary>
    public class DiodeAND : BaseElement
    {
        /// <summary>Array of diode cathode inputs.</summary>
        public Pin[] In;
        /// <summary>Output of the combined anode and the pull-up.</summary>
        public Pin Out;

        /// <summary>
        /// Creates the DiodeAND instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        /// <param name="ConnectedNets">Array of input nets.</param>
        public DiodeAND(string Name, Net[] ConnectedNets) : base(Name)
        {
            Power = new Pin[0];
            Ground = new Pin[0];
            Passive = new Pin[0];

            this.In = new Pin[ConnectedNets.Length];
            for (int i = 0; i < ConnectedNets.Length; i++)
                this.In[i] = new Pin(this, "In"+i.ToString(), "", LineMode.In, SignalState.H, ConnectedNets[i]);

            this.Out = new Pin(this, "Out", "", LineMode.Out, SignalState.L, 5);

            Inputs = new Pin[1][];
            SetPinArray(Inputs, 0, this.In);

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, this.Out);
        }

        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);

            SignalState currState = SignalState.H;
            for (int i = 0;i < In.Length;i++)
                if (In[i].State == SignalState.L)
                {
                    currState = SignalState.L;
                    break;
                }

            Out.NewOutState = currState;
        }
    }
}