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

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74HCT377.
    /// </summary>
    public class HCT377 : ClockedChip
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/sn74hct377.pdf

        private const double TYP_PROPAGATION_DELAY = 12;

        #region Input Pins
        public Pin CLKENn;

        public Pin I1D;
        public Pin I2D;
        public Pin I3D;
        public Pin I4D;
        public Pin I5D;
        public Pin I6D;
        public Pin I7D;
        public Pin I8D;
        #endregion Input Pins

        #region Output Pins
        public Pin O1Q;
        public Pin O2Q;
        public Pin O3Q;
        public Pin O4Q;
        public Pin O5Q;
        public Pin O6Q;
        public Pin O7Q;
        public Pin O8Q;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT377(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT377(string Name, Net NetCLK, Net NetCLKENn, Net NetD1, Net NetD2, Net NetD3, Net NetD4, Net NetD5, Net NetD6, Net NetD7, Net NetD8) : base(Name, "CLK", "11", NetCLK)
        {
            this.Power[0] =  new Pin(this, "VCC", "20");
            this.Ground[0] = new Pin(this, "GND", "10");

            this.CLKENn = new Pin(this, "CLKENn", "1", LineMode.In, SignalState.L, NetCLKENn);

            this.I1D = new Pin(this, "1D",  "3", LineMode.In, SignalState.L, NetD1);
            this.I2D = new Pin(this, "2D",  "4", LineMode.In, SignalState.L, NetD2);
            this.I3D = new Pin(this, "3D",  "7", LineMode.In, SignalState.L, NetD3);
            this.I4D = new Pin(this, "4D",  "8", LineMode.In, SignalState.L, NetD4);
            this.I5D = new Pin(this, "5D", "13", LineMode.In, SignalState.L, NetD5);
            this.I6D = new Pin(this, "6D", "14", LineMode.In, SignalState.L, NetD6);
            this.I7D = new Pin(this, "7D", "17", LineMode.In, SignalState.L, NetD7);
            this.I8D = new Pin(this, "8D", "18", LineMode.In, SignalState.L, NetD8);

            this.O1Q = new Pin(this, "1Q", "2", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O2Q = new Pin(this, "2Q", "5", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O3Q = new Pin(this, "3Q", "6", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O4Q = new Pin(this, "4Q", "9", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O5Q = new Pin(this, "5Q", "12", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O6Q = new Pin(this, "6Q", "15", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O7Q = new Pin(this, "7Q", "16", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O8Q = new Pin(this, "8Q", "19", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[3][];
            SetPinArray(Inputs, 0, this.CLK);
            SetPinArray(Inputs, 1, this.CLKENn);
            SetPinArray(Inputs, 2, new Pin[] { this.I1D, this.I2D, this.I3D, this.I4D, this.I5D, this.I6D, this.I7D, this.I8D });

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, new Pin[] { this.O1Q, this.O2Q, this.O3Q, this.O4Q, this.O5Q, this.O6Q, this.O7Q, this.O8Q });

        }
        #endregion Constructors

        #region Private/Protected Methods
        /// <summary>
        /// Called on the rising edge of the clock to load.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        protected override void RisingEdge(double Time)
        {
            //if (InputsValidLogicState() == false)
            //    SetOutputStates(SignalState.U);
            //else 
            if (CLKENn.State == SignalState.L)
            {
                for (int i = 0; i < Inputs[2].Length; i++)
                    Outputs[0][i].NewOutState = Inputs[2][i].State;
            }
            else UpdateOutputs(Time);
        }
        #endregion Private/Protected Methods

    }
}
