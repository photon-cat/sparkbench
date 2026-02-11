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
    /// Class definition of the logic chip 74HCT14.
    /// </summary>
    public class HCT14 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/sn74hct14.pdf

        private const double TYP_PROPAGATION_DELAY = 18;

        #region Input Pins
        public Pin I1A;
        public Pin I2A;
        public Pin I3A;
        public Pin I4A;
        public Pin I5A;
        public Pin I6A;
        #endregion Input Pins

        #region Output Pins
        public Pin O1Y;
        public Pin O2Y;
        public Pin O3Y;
        public Pin O4Y;
        public Pin O5Y;
        public Pin O6Y;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT14(string Name) : this(Name, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT14(string Name, Net NetI1A, Net NetI2A, Net NetI3A, Net NetI4A, Net NetI5A, Net NetI6A) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "14");
            this.Ground[0] = new Pin(this, "GND", "7");

            this.I1A = new Pin(this, "1A", "1", LineMode.In, SignalState.L, NetI1A);
            this.I2A = new Pin(this, "2A", "3", LineMode.In, SignalState.L, NetI2A);
            this.I3A = new Pin(this, "3A", "5", LineMode.In, SignalState.L, NetI3A);
            this.I4A = new Pin(this, "4A", "9", LineMode.In, SignalState.L, NetI4A);
            this.I5A = new Pin(this, "5A", "11", LineMode.In, SignalState.L, NetI5A);
            this.I6A = new Pin(this, "6A", "13", LineMode.In, SignalState.L, NetI6A);

            this.O1Y = new Pin(this, "1Y", "2", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O2Y = new Pin(this, "2Y", "4", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O3Y = new Pin(this, "3Y", "6", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O4Y = new Pin(this, "4Y", "8", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O5Y = new Pin(this, "5Y", "10", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.O6Y = new Pin(this, "6Y", "12", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[6][];
            SetPinArray(Inputs, 0, this.I1A);
            SetPinArray(Inputs, 1, this.I2A);
            SetPinArray(Inputs, 2, this.I3A);
            SetPinArray(Inputs, 3, this.I4A);
            SetPinArray(Inputs, 4, this.I5A);
            SetPinArray(Inputs, 5, this.I6A);

            Outputs = new Pin[6][];
            SetPinArray(Outputs, 0, this.O1Y);
            SetPinArray(Outputs, 1, this.O2Y);
            SetPinArray(Outputs, 2, this.O3Y);
            SetPinArray(Outputs, 3, this.O4Y);
            SetPinArray(Outputs, 4, this.O5Y);
            SetPinArray(Outputs, 5, this.O6Y);
        }
        #endregion Constructors

        #region Private Methods
        /// <summary>
        /// Implement the Inverter function.
        /// </summary>
        /// <param name="InA">Input Pin A to check.</param>
        /// <param name="OutY">Output pin to set.</param>
        private void Inv(Pin InA, Pin OutY)
        {
            if (InA.State == SignalState.H)
                OutY.NewOutState = SignalState.L;
            else
                OutY.NewOutState = SignalState.H;
        }
        #endregion Private Methods

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
            Inv(I1A, O1Y);
            Inv(I2A, O2Y);
            Inv(I3A, O3Y);
            Inv(I4A, O4Y);
            Inv(I5A, O5Y);
            Inv(I6A, O6Y);
        }
        #endregion Public Methods

    }
}